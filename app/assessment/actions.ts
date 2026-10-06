"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyBusiness, getSessionProfile } from "@/lib/auth";
import { QUESTIONS, STAGE_QUESTION, scoreAssessment, type Answers } from "@/lib/assessment";
import { rateLimit } from "@/lib/turnstile";

const COOKIE = "fl_assess";

function cleanAnswers(raw: unknown): Answers | null {
  const parsed = z.record(z.string(), z.union([z.number(), z.string()])).safeParse(raw);
  if (!parsed.success) return null;
  const out: Answers = {};
  const stage = parsed.data.stage;
  if (typeof stage === "string" && STAGE_QUESTION.options.some((o) => o.id === stage)) out.stage = stage;
  for (const q of QUESTIONS) {
    const v = Number(parsed.data[q.id]);
    if (Number.isInteger(v) && v >= 0 && v < q.options.length) out[q.id] = v;
  }
  return out;
}

async function persist(answers: Answers, userId: string, email: string | null) {
  const result = scoreAssessment(answers);
  const business = await getMyBusiness();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessments")
    .insert({
      user_id: userId, business_id: business?.id ?? null, email, answers, score: result.score, band: result.band.id,
      pillar_scores: result.pillarScores, gaps: result.topGaps, recommended_paths: result.pathsNow,
    })
    .select("id")
    .single();
  if (error) throw new Error("We couldn't save your assessment. Try again.");
  // The latest assessment drives the dashboard readiness score and the matching readiness bonus.
  if (business) await supabase.from("businesses").update({ readiness_score: result.score, ...(business.stage ? {} : { stage: result.stage }) }).eq("id", business.id);
  return data.id as string;
}

export type AssessmentState =
  | { kind: "teaser"; score: number; band: string; gap: string | null; pathsNow: string[] }
  | { kind: "saved" }
  | { kind: "error"; error: string }
  | undefined;

/** Visitors get a teaser and their answers are kept in a cookie until they sign up; members get the full saved report. */
export async function submitAssessment(_prev: AssessmentState, formData: FormData): Promise<AssessmentState> {
  if (!(await rateLimit("assessment", 10, 10 * 60_000))) return { kind: "error", error: "Too many attempts. Try again later." };
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("answers") ?? "{}"));
  } catch {
    return { kind: "error", error: "Something went wrong. Try again." };
  }
  const answers = cleanAnswers(raw);
  if (!answers) return { kind: "error", error: "Something went wrong. Try again." };
  const session = await getSessionProfile().catch(() => null);
  if (session) {
    try {
      await persist(answers, session.userId, session.profile.email);
    } catch (e) {
      return { kind: "error", error: (e as Error).message };
    }
    return { kind: "saved" };
  }
  const result = scoreAssessment(answers);
  const jar = await cookies();
  jar.set(COOKIE, JSON.stringify(answers), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 14, path: "/" });
  const email = z.string().trim().email().safeParse(formData.get("email"));
  if (email.success) {
    await createAdminClient().from("leads").insert({
      kind: "assessment", email: email.data, answers, score: result.score, result_band: result.band.id, source_page: "/assessment",
    });
  }
  return { kind: "teaser", score: result.score, band: result.band.label, gap: result.topGaps[0]?.fix ?? null, pathsNow: result.pathsNow };
}

/** Called from /app/assessment after signup: saves the visitor's answers from the cookie, then clears it. */
export async function claimAssessment(): Promise<boolean> {
  const session = await getSessionProfile();
  if (!session) return false;
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return false;
  jar.delete(COOKIE);
  let answers: Answers | null = null;
  try {
    answers = cleanAnswers(JSON.parse(raw));
  } catch {}
  if (!answers || Object.keys(answers).length < 5) return false;
  await persist(answers, session.userId, session.profile.email);
  return true;
}

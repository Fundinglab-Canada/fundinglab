"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyBusiness, getSessionProfile } from "@/lib/auth";
import { rateLimit, verifyTurnstile } from "@/lib/turnstile";
import { sendEmail, teamInbox } from "@/lib/email";
import { env } from "@/lib/env";

export type FormState = { ok?: boolean; error?: string } | undefined;

const fitCall = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(40).optional(),
  business_name: z.string().trim().max(160).optional(),
  city: z.string().trim().max(120).optional(),
  project_description: z.string().trim().min(10, "Tell us a little about your project.").max(2000),
  program_id: z.string().uuid().optional().or(z.literal("")),
  program_name: z.string().max(200).optional(),
  quick_check: z.string().max(2000).optional(),
  source_page: z.string().max(200).optional(),
});

async function linkUser() {
  const session = await getSessionProfile().catch(() => null);
  const business = session ? await getMyBusiness().catch(() => null) : null;
  return { userId: session?.userId ?? null, businessId: business?.id ?? null };
}

/** "Book a Free Fit Call" (§4G-13): saves a lead, emails the team inbox, confirms to the applicant. */
export async function bookFitCall(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await rateLimit("fit-call", 5, 10 * 60_000))) return { error: "Too many requests. Try again in a few minutes." };
  if (!(await verifyTurnstile(formData))) return { error: "Please complete the security check and try again." };
  const parsed = fitCall.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  let quick: { score?: number; band?: string; answers?: Record<string, boolean> } = {};
  try { quick = d.quick_check ? JSON.parse(d.quick_check) : {}; } catch {}
  const { userId, businessId } = await linkUser();

  const db = createAdminClient();
  const { error } = await db.from("leads").insert({
    kind: "fit_call", program_id: d.program_id || null, user_id: userId, business_id: businessId,
    name: d.name, email: d.email, phone: d.phone || null, business_name: d.business_name || null, city: d.city || null,
    project_description: d.project_description, answers: quick.answers ?? {}, score: quick.score ?? null, result_band: quick.band ?? null,
    source_page: d.source_page ?? null,
  });
  if (error) return { error: "We couldn't save your request. Email us instead and we'll reply within 1–2 business days." };

  const program = d.program_name || "General grants";
  await sendEmail({
    to: teamInbox(),
    replyTo: d.email,
    subject: `New fit call: ${program} — ${d.name}`,
    text: [
      `Program: ${program}`, `Name: ${d.name}`, `Email: ${d.email}`, `Phone: ${d.phone || "—"}`,
      `Business/organization: ${d.business_name || "—"}`, `Community/city: ${d.city || "—"}`,
      `Quick check: ${quick.score != null ? `${quick.score} (${quick.band ?? ""})` : "not taken"}`, "", d.project_description, "",
      `Admin: ${env.siteUrl()}/admin/leads`,
    ].join("\n"),
  });
  await sendEmail({
    to: d.email,
    subject: "We received your fit call request",
    text: `Thanks, ${d.name.split(" ")[0]}. The Funding Lab Team will reply within 1–2 business days to book your free 30-minute fit call about ${program}.`,
  });
  return { ok: true };
}

const quickCheck = z.object({
  program_id: z.string().uuid(),
  answers: z.record(z.string(), z.boolean()),
  score: z.number().int().min(0).max(20),
  band: z.string().max(200),
});

/** Saves a quick-check result as a lead; when signed in, it's tied to the business profile (§4G-6). */
export async function saveQuickCheck(input: unknown): Promise<{ ok: boolean }> {
  if (!(await rateLimit("quick-check", 20, 10 * 60_000))) return { ok: false };
  const parsed = quickCheck.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { userId, businessId } = await linkUser();
  const db = createAdminClient();
  await db.from("leads").insert({
    kind: "quick_check", program_id: parsed.data.program_id, user_id: userId, business_id: businessId,
    answers: parsed.data.answers, score: parsed.data.score, result_band: parsed.data.band, source_page: "featured-grant",
  });
  if (businessId) await db.from("saved_programs").upsert({ business_id: businessId, program_id: parsed.data.program_id });
  return { ok: true };
}

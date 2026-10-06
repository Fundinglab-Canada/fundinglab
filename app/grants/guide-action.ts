"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/turnstile";

export type GuideState = { ok?: boolean; url?: string; error?: string } | undefined;

export async function requestGuide(_prev: GuideState, formData: FormData): Promise<GuideState> {
  if (!(await rateLimit("guide", 6, 10 * 60_000))) return { error: "Too many requests. Try again in a few minutes." };
  const parsed = z.object({ email: z.string().trim().email("Enter a valid email address."), program_id: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const programId = parsed.data.program_id.startsWith("fallback") ? null : parsed.data.program_id;
  const db = createAdminClient();
  await db.from("leads").insert({
    kind: "guide_download", program_id: programId, email: parsed.data.email,
    answers: { marketing_opt_in: formData.get("marketing") === "on" }, source_page: "featured-grant",
  });
  if (!programId) return { ok: true };
  const { data: program } = await db.from("programs").select("guide_pdf_path").eq("id", programId).single();
  if (!program?.guide_pdf_path) return { ok: true };
  const { data } = await db.storage.from("guides").createSignedUrl(program.guide_pdf_path, 60 * 60);
  return data?.signedUrl ? { ok: true, url: data.signedUrl } : { ok: true };
}

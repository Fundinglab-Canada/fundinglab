"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, verifyTurnstile } from "@/lib/turnstile";
import { sendEmail, teamInbox } from "@/lib/email";
import { env } from "@/lib/env";

const MAX = 10 * 1024 * 1024;
const OK_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const url = z.string().trim().url().max(300).optional().or(z.literal(""));

const schema = z.object({
  job_id: z.string().uuid().optional().or(z.literal("")),
  full_name: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(40).optional(),
  city: z.string().trim().max(80).optional(),
  province: z.string().length(2).optional(),
  linkedin_url: url,
  portfolio_url: url,
  cover_letter_text: z.string().trim().max(5000).optional(),
  why_us: z.string().trim().max(1000, "Keep “Why Funding Lab?” under 1,000 characters.").optional(),
  start_date: z.string().optional(),
  work_type: z.string().max(40).optional(),
  work_eligible: z.enum(["yes", "no"], { errorMap: () => ({ message: "Tell us whether you can work in Canada." }) }),
  source: z.string().trim().max(200).optional(),
  consent: z.literal("on", { errorMap: () => ({ message: "Tick the consent box to submit." }) }),
});

async function upload(db: ReturnType<typeof createAdminClient>, file: File, prefix: string) {
  if (file.size > MAX) throw new Error("Files must be 10 MB or smaller.");
  if (!OK_TYPES.includes(file.type)) throw new Error("Upload a PDF or Word document.");
  const path = `${prefix}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_").slice(-100)}`;
  const { error } = await db.storage.from("careers").upload(path, file, { contentType: file.type });
  if (error) throw new Error("Upload failed. Try again.");
  return path;
}

export async function submitApplication(_prev: { ok?: boolean; error?: string } | undefined, formData: FormData) {
  if (!(await rateLimit("careers", 3, 10 * 60_000))) return { error: "Too many submissions. Try again later." };
  if (!(await verifyTurnstile(formData))) return { error: "Please complete the security check and try again." };
  const parsed = schema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const resume = formData.get("resume");
  if (!(resume instanceof File) || !resume.size) return { error: "Attach your resume (PDF or DOCX)." };
  const cover = formData.get("cover_letter");
  const d = parsed.data;
  const db = createAdminClient();

  let resumePath: string;
  let coverPath: string | null = null;
  try {
    const folder = new Date().toISOString().slice(0, 7);
    resumePath = await upload(db, resume, folder);
    if (cover instanceof File && cover.size) coverPath = await upload(db, cover, folder);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await db.from("job_applications").insert({
    job_id: d.job_id || null, full_name: d.full_name, email: d.email, phone: d.phone || null, city: d.city || null, province: d.province || null,
    linkedin_url: d.linkedin_url || null, portfolio_url: d.portfolio_url || null, resume_path: resumePath, cover_letter_path: coverPath,
    cover_letter_text: d.cover_letter_text || null, why_us: d.why_us || null, start_date: d.start_date || null, work_type: d.work_type || null,
    work_eligible: d.work_eligible === "yes", source: d.source || null,
  });
  if (error) {
    await db.storage.from("careers").remove([resumePath, ...(coverPath ? [coverPath] : [])]);
    return { error: "We couldn't save your application. Try again." };
  }

  let title = "General application";
  if (d.job_id) title = (await db.from("jobs").select("title").eq("id", d.job_id).single()).data?.title ?? title;
  await sendEmail({ to: d.email, subject: `We received your application: ${title}`, text: `Hi ${d.full_name.split(" ")[0]}, thanks for applying to Funding Lab (${title}). We'll be in touch if there's a fit. We keep applications for up to 12 months.` });
  await sendEmail({ to: teamInbox(), replyTo: d.email, subject: `New application: ${title} — ${d.full_name}`, text: `Review it: ${env.siteUrl()}/admin/careers` });
  return { ok: true };
}

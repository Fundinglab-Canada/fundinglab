"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth";
import { rateLimit, verifyTurnstile } from "@/lib/turnstile";
import { sendEmail, sendSms, teamInbox } from "@/lib/email";
import { ptString, webinarGoogleUrl, webinarIcs } from "@/lib/webinar";
import { STAGES } from "@/lib/constants";

const schema = z.object({
  session_id: z.string().uuid("Choose a session."),
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(40).optional(),
  business_name: z.string().trim().max(160).optional(),
  stage: z.enum(STAGES.map((s) => s.id) as [string, ...string[]]).optional().or(z.literal("")),
  question: z.string().trim().max(1000).optional(),
  sms_opt_in: z.literal("on").optional(),
  source: z.string().max(60).optional(),
});

export type WebinarState = { ok?: boolean; error?: string; google?: string; icsUrl?: string; when?: string } | undefined;

export async function registerWebinar(_prev: WebinarState, formData: FormData): Promise<WebinarState> {
  if (!(await rateLimit("webinar", 5, 10 * 60_000))) return { error: "Too many requests. Try again later." };
  if (!(await verifyTurnstile(formData))) return { error: "Please complete the security check and try again." };
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.sms_opt_in && !d.phone) return { error: "Add a mobile number to get SMS reminders." };

  const db = createAdminClient();
  const { data: session } = await db.from("webinar_sessions").select("id, starts_at, duration_minutes, topic, join_url, status, capacity").eq("id", d.session_id).maybeSingle();
  if (!session || session.status !== "scheduled" || new Date(session.starts_at).getTime() < Date.now()) return { error: "That session is no longer open. Pick another date." };
  if (session.capacity) {
    const { count } = await db.from("webinar_registrations").select("id", { count: "exact", head: true }).eq("session_id", session.id);
    if ((count ?? 0) >= session.capacity) return { error: "That session is full. Pick another date." };
  }
  const user = await getSessionProfile().catch(() => null);
  const { error } = await db.from("webinar_registrations").upsert(
    {
      session_id: session.id, user_id: user?.userId ?? null, name: d.name, email: d.email.toLowerCase(), phone: d.phone || null,
      business_name: d.business_name || null, stage: d.stage || null, question: d.question || null, sms_opt_in: !!d.sms_opt_in, source: d.source || "webinar_page",
    },
    { onConflict: "session_id,email" },
  );
  if (error) return { error: "We couldn't save your registration. Try again." };

  const when = ptString(session.starts_at);
  const google = webinarGoogleUrl(session);
  await sendEmail({
    to: d.email,
    subject: `You're registered: Funding Webinar, ${when}`,
    text: `Hi ${d.name.split(" ")[0]},\n\nYou're registered for the free Funding Lab Webinar on ${when}.\nTopic: ${session.topic}\n\n${session.join_url ? `Join link: ${session.join_url}` : "We'll email the join link before the session."}\n\nAdd to Google Calendar: ${google}\nThe attached .ics file works with Outlook and Apple Calendar.\n\nWe'll send reminders 24 hours and 1 hour before.`,
    attachments: [{ filename: "funding-lab-webinar.ics", content: webinarIcs(session), contentType: "text/calendar" }],
  });
  if (d.sms_opt_in && d.phone) await sendSms(d.phone, `Funding Lab: you're registered for the Funding Webinar, ${when}.`);
  if (d.question) await sendEmail({ to: teamInbox(), replyTo: d.email, subject: `Webinar question from ${d.name}`, text: `${when}\n\n${d.question}` });
  return { ok: true, google, icsUrl: `/api/webinar/${session.id}/ics`, when };
}

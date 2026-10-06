"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth";
import { CONTACT_ROLES, CONTACT_TOPICS } from "@/lib/constants";
import { rateLimit, verifyTurnstile } from "@/lib/turnstile";
import { sendEmail, teamInbox } from "@/lib/email";
import { env } from "@/lib/env";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(40).optional(),
  business_name: z.string().trim().max(160).optional(),
  role: z.enum(CONTACT_ROLES),
  topic: z.enum(CONTACT_TOPICS),
  message: z.string().trim().min(5, "Write a short message.").max(2000, "Keep your message under 2,000 characters."),
  consent: z.literal("on", { errorMap: () => ({ message: "Tick the consent box so we can reply." }) }),
});

/** §4E: save → notify team inbox (reply-to = sender) → auto-reply → success message. */
export async function sendContactMessage(_prev: { ok?: boolean; error?: string } | undefined, formData: FormData) {
  if (!(await rateLimit("contact", 5, 10 * 60_000))) return { error: "Too many messages. Try again in a few minutes." };
  if (!(await verifyTurnstile(formData))) return { error: "Please complete the security check and try again." };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const session = await getSessionProfile().catch(() => null);

  const { error } = await createAdminClient().from("contact_messages").insert({
    name: d.name, email: d.email, phone: d.phone || null, business_name: d.business_name || null,
    role: d.role, topic: d.topic, message: d.message, user_id: session?.userId ?? null,
  });
  if (error) return { error: "We couldn't send your message. Please email us directly." };

  await sendEmail({
    to: teamInbox(),
    replyTo: d.email,
    subject: `New enquiry: ${d.topic} — ${d.name}`,
    text: `${d.name} <${d.email}>\nPhone: ${d.phone || "—"}\nBusiness: ${d.business_name || "—"}\nI am a: ${d.role}\nTopic: ${d.topic}\n\n${d.message}\n\nAdmin inbox: ${env.siteUrl()}/admin/messages`,
  });
  await sendEmail({
    to: d.email,
    subject: "We've received your message",
    text: "Thanks, we've received your message. The Funding Lab Team will reply within 1–2 business days.",
  });
  return { ok: true };
}

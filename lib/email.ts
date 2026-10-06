import "server-only";
import { BRAND } from "@/lib/constants";

type Attachment = { filename: string; content: string; contentType?: string };
type Email = { to: string | string[]; subject: string; text: string; replyTo?: string; attachments?: Attachment[] };

/** Sends via Resend when RESEND_API_KEY is set; otherwise logs (local dev). Never throws. */
export async function sendEmail({ to, subject, text, replyTo, attachments }: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const body = `${text}\n\n—\n${BRAND.contactLine}\n\n${BRAND.disclaimer}`;
  if (!key) {
    console.info(`[email:dev] to=${String(to)} subject=${subject}${replyTo ? ` reply-to=${replyTo}` : ""}\n${body}`);
    return true;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Funding Lab <hello@fundinglab.ca>",
        to,
        subject,
        text: body,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(attachments?.length
          ? { attachments: attachments.map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString("base64"), content_type: a.contentType })) }
          : {}),
      }),
    });
    if (!res.ok) console.error("[email] send failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[email] send error", e);
    return false;
  }
}

/** Team inbox for contact, fit-call and lead notifications (§4E). Changeable without code edits. */
export const teamInbox = () => process.env.CONTACT_INBOX_EMAIL ?? BRAND.contactEmail;

/** Optional SMS via Twilio (opt-in only). Silently skipped when not configured. */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from || !to) return false;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: from, Body: `${body} Reply STOP to opt out.` }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const EMAIL_TEMPLATES: Record<string, (p: Record<string, unknown>) => { subject: string; text: string }> = {
  introduction_proposed: () => ({
    subject: "Funding Lab has an introduction for you",
    text: "Funding Lab has an introduction for you. Sign in to see the partner type and why it fits, then accept or decline. Names and contact details are shared only if both sides accept.",
  }),
  opportunity_curated: () => ({
    subject: "A new curated opportunity is waiting",
    text: "Funding Lab has curated a new opportunity for you. Sign in to review the anonymized profile and choose Interested or Pass.",
  }),
  introduction_mutual: () => ({
    subject: "Your introduction is confirmed",
    text: "Both sides accepted the introduction. Sign in to see contact details and next steps.",
  }),
  introduction_reminder: () => ({
    subject: "Reminder: an introduction is waiting for your reply",
    text: "An introduction from Funding Lab is waiting for your reply. It expires 14 days after it was sent.",
  }),
  partner_approved: () => ({
    subject: "Your Funding Lab partner profile is active",
    text: "Your partner profile has been approved. You can now review curated deal flow and introductions.",
  }),
  service_paid: (p) => ({
    subject: `We received your ${String(p.service ?? "service")} order`,
    text: "Thank you. The Funding Lab Team will contact you within one business day to confirm scope and timeline.",
  }),
  grant_history_found: () => ({
    subject: "We found federal funding linked to your business",
    text: "Your Funding Lab profile now shows federal grants and contributions linked to your business from Government of Canada open data.",
  }),
};

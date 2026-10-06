import "server-only";
import { BRAND } from "@/lib/constants";

type Email = { to: string; subject: string; text: string };

/** Sends via Resend when RESEND_API_KEY is set; otherwise logs (local dev). */
export async function sendEmail({ to, subject, text }: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const body = `${text}\n\n—\n${BRAND.name}\n${BRAND.contactLine}\n\n${BRAND.disclaimer}`;
  if (!key) {
    console.info(`[email:dev] to=${to} subject=${subject}\n${body}`);
    return true;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Funding Lab <hello@fundinglab.ca>", to, subject, text: body }),
  });
  if (!res.ok) console.error("[email] send failed", res.status, await res.text());
  return res.ok;
}

export const EMAIL_TEMPLATES: Record<string, (p: Record<string, unknown>) => { subject: string; text: string }> = {
  introduction_proposed: () => ({
    subject: "Funding Lab has an introduction for you",
    text: "Funding Lab has proposed a private introduction. Sign in to review it and choose whether to connect. Contact details are shared only if both sides accept.",
  }),
  introduction_mutual: () => ({
    subject: "Your introduction is confirmed",
    text: "Both sides accepted the introduction. Sign in to see contact details and next steps.",
  }),
  partner_approved: () => ({
    subject: "Your Funding Lab partner profile is active",
    text: "Your partner profile has been approved. You will receive consented introductions that match your criteria.",
  }),
  service_paid: (p) => ({
    subject: `We received your ${String(p.service ?? "service")} order`,
    text: "Thank you. A Funding Lab expert will contact you within one business day to confirm scope and timeline.",
  }),
  quote_requested: (p) => ({
    subject: `New quote request: ${String(p.service ?? "")}`,
    text: `A business requested a quote. Review it in the admin console: ${String(p.url ?? "")}`,
  }),
};

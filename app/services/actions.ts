"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyBusiness, getSessionProfile, requireUser } from "@/lib/auth";
import { SERVICE_FORMS, SERVICES, serviceName, type ServiceKind } from "@/lib/constants";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { sendEmail, teamInbox } from "@/lib/email";
import { rateLimit, verifyTurnstile } from "@/lib/turnstile";

/** "Pay now": checkout for a quote the Funding Lab Team has sent (status quote_sent, amount set by an admin). */
export async function payQuote(formData: FormData) {
  await requireUser("/app/services");
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  // RLS: owners can read only their own orders.
  const { data: order } = await supabase.from("service_orders").select("id, kind, status, quote_amount_cad").eq("id", id).maybeSingle();
  if (!order || order.status !== "quote_sent" || !order.quote_amount_cad) redirect("/app/services?status=unavailable");
  const business = await getMyBusiness();
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    currency: "cad",
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "cad",
        unit_amount: Math.round(Number(order.quote_amount_cad) * 100),
        product_data: { name: serviceName(order.kind), description: "As quoted by the Funding Lab Team." },
      },
    }],
    customer_email: business?.contact_email ?? undefined,
    client_reference_id: order.id,
    metadata: { service_order_id: order.id, kind: order.kind },
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    success_url: `${env.siteUrl()}/app/services?status=paid`,
    cancel_url: `${env.siteUrl()}/app/services?status=cancelled`,
  });
  // Owners can't update orders under RLS; record the session with the service role (the order was read under RLS above).
  await createAdminClient().from("service_orders").update({ status: "checkout_started", stripe_checkout_session_id: session.id }).eq("id", order.id);
  redirect(session.url!);
}

const growthBase = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(40).optional(),
  business_name: z.string().trim().max(160).optional(),
  description: z.string().trim().min(10, "Describe what you need in a sentence or two.").max(3000),
  timeline: z.string().max(40).optional(),
  budget: z.string().max(40).optional(),
});

/** Short requirement form on every service page. Signed-in owners get a service order; visitors a lead. */
export async function submitServiceRequest(_prev: { ok?: boolean; error?: string } | undefined, formData: FormData) {
  const kind = formData.get("kind") as ServiceKind;
  const cfg = SERVICE_FORMS[kind];
  const service = SERVICES.find((s) => s.kind === kind);
  if (!cfg || !service) return { error: "Unknown service." };
  if (!(await rateLimit(`quote:${kind}`, 5, 10 * 60_000))) return { error: "Too many requests. Try again later." };
  if (!(await verifyTurnstile(formData))) return { error: "Please complete the security check and try again." };
  const parsed = growthBase.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const details: Record<string, string> = {};
  for (const f of cfg.fields) {
    const v = String(formData.get(f.key) ?? "").trim().slice(0, 500);
    if (f.required && !v) return { error: `Fill in “${f.label}”.` };
    if (v) details[f.key] = v;
  }
  const d = parsed.data;
  const all = { ...details, description: d.description, timeline: d.timeline ?? null, budget: d.budget ?? null, contact: { name: d.name, email: d.email, phone: d.phone ?? null } };
  const trigger = String(formData.get("trigger_source") ?? "services_page").slice(0, 60);

  const session = await getSessionProfile();
  if (session) {
    const business = await getMyBusiness();
    const supabase = await createClient();
    const { error } = await supabase.from("service_orders").insert({
      kind, status: "quote_requested", message: d.description, business_id: business?.id ?? null, requested_by: session.userId, details: all, trigger_source: trigger,
    });
    if (error) return { error: "We couldn't save your request. Try again." };
  } else {
    const { error } = await createAdminClient().from("leads").insert({
      kind: "service_quote", name: d.name, email: d.email, phone: d.phone || null, business_name: d.business_name || null,
      project_description: d.description, answers: { service: kind, ...all }, source_page: `/services/${kind}`,
    });
    if (error) return { error: "We couldn't save your request. Try again." };
  }
  await sendEmail({ to: teamInbox(), replyTo: d.email, subject: `Quote request: ${service.name} — ${d.business_name || d.name}`, text: `${d.description}\n\n${JSON.stringify(details, null, 2)}\n\nReview: ${env.siteUrl()}/admin/${session ? "services" : "leads"}` });
  await sendEmail({ to: d.email, subject: `We received your ${service.name} request`, text: `Hi ${d.name.split(" ")[0]}, thanks for your request. The Funding Lab Team will reply within one business day with next steps.` });
  return { ok: true };
}

const meetingSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(7, "Enter a phone number so we can confirm the time.").max(40),
  business_name: z.string().trim().max(160).optional(),
  preferred_time: z.string().trim().min(2, "Tell us when suits you.").max(200),
  topic: z.string().trim().max(1000).optional(),
});

/** "Book a 15-minute meeting" on service pages. Saved as a lead; the team confirms the time by email or phone. */
export async function bookMeeting(_prev: { ok?: boolean; error?: string } | undefined, formData: FormData) {
  const kind = String(formData.get("kind") ?? "");
  const service = SERVICES.find((s) => s.kind === kind);
  if (!(await rateLimit("meeting", 5, 10 * 60_000))) return { error: "Too many requests. Try again later." };
  if (!(await verifyTurnstile(formData))) return { error: "Please complete the security check and try again." };
  const parsed = meetingSchema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const session = await getSessionProfile();
  const { error } = await createAdminClient().from("leads").insert({
    kind: "meeting", user_id: session?.userId ?? null, name: d.name, email: d.email, phone: d.phone, business_name: d.business_name || null,
    project_description: d.topic || null, answers: { service: kind, preferred_time: d.preferred_time }, source_page: `/services/${kind}`,
  });
  if (error) return { error: "We couldn't save your request. Try again." };
  const what = service?.name ?? "Funding Lab";
  await sendEmail({ to: teamInbox(), replyTo: d.email, subject: `15-min meeting request: ${what} — ${d.business_name || d.name}`,
    text: `${d.name} · ${d.email} · ${d.phone}\nPreferred time: ${d.preferred_time}\n\n${d.topic ?? ""}\n\nReview: ${env.siteUrl()}/admin/leads` });
  await sendEmail({ to: d.email, subject: "Your 15-minute meeting request", text: `Hi ${d.name.split(" ")[0]}, thanks for booking a call about ${what}. The Funding Lab Team will confirm a time within one business day.` });
  return { ok: true };
}

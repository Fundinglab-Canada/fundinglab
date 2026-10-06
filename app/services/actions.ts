"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyBusiness, getSessionProfile, requireUser } from "@/lib/auth";
import { GROWTH_QUOTE_FIELDS, SERVICES, type GrowthKind } from "@/lib/constants";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { sendEmail, teamInbox } from "@/lib/email";
import { rateLimit, verifyTurnstile } from "@/lib/turnstile";

const kindSchema = z.enum(SERVICES.map((s) => s.kind) as [string, ...string[]]);

async function createOrder(formData: FormData, status: "quote_requested" | "checkout_started") {
  const { userId } = await requireUser("/services");
  const kind = kindSchema.parse(formData.get("kind"));
  const message = z.string().trim().max(2000).optional().parse(formData.get("message") || undefined);
  const service = SERVICES.find((s) => s.kind === kind)!;
  const business = await getMyBusiness();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_orders")
    .insert({
      kind: service.kind,
      status,
      message: message ?? null,
      amount: service.priceCents != null ? service.priceCents / 100 : null,
      business_id: business?.id ?? null,
      requested_by: userId,
      trigger_source: String(formData.get("trigger_source") ?? "services_page").slice(0, 60),
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not create the order: ${error.message}`);
  return { orderId: data.id as string, service, business };
}

export async function requestQuote(formData: FormData) {
  const { service } = await createOrder(formData, "quote_requested");
  await sendEmail({ to: teamInbox(), subject: `Quote requested: ${service.name}`, text: `Review it: ${env.siteUrl()}/admin/services` });
  redirect("/app/services?status=quote");
}

export async function checkoutService(formData: FormData) {
  const { orderId, service, business } = await createOrder(formData, "checkout_started");
  if (service.priceCents == null) redirect("/app/services?status=quote");
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    currency: "cad",
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "cad",
        unit_amount: service.priceCents,
        product_data: { name: `${service.name} — deposit`, description: "Final scope confirmed by the Funding Lab Team." },
      },
    }],
    customer_email: business?.contact_email ?? undefined,
    client_reference_id: orderId,
    metadata: { service_order_id: orderId, kind: service.kind },
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    success_url: `${env.siteUrl()}/app/services?status=paid`,
    cancel_url: `${env.siteUrl()}/app/services?status=cancelled`,
  });
  // Owners can't update orders under RLS; record the session id with the service role (order id came from our insert).
  await createAdminClient().from("service_orders").update({ stripe_checkout_session_id: session.id }).eq("id", orderId);
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

/** Public quote form for Hiring, Development and Sales & Marketing. Signed-in owners get a service order; visitors a lead. */
export async function submitGrowthQuote(_prev: { ok?: boolean; error?: string } | undefined, formData: FormData) {
  const kind = formData.get("kind") as GrowthKind;
  const cfg = GROWTH_QUOTE_FIELDS[kind];
  if (!cfg) return { error: "Unknown service." };
  if (!(await rateLimit(`quote:${kind}`, 5, 10 * 60_000))) return { error: "Too many requests. Try again later." };
  if (!(await verifyTurnstile(formData))) return { error: "Please complete the security check and try again." };
  const parsed = growthBase.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const details: Record<string, string> = {};
  for (const f of cfg.fields) {
    const v = String(formData.get(f.key) ?? "").trim().slice(0, 500);
    if ("required" in f && f.required && !v) return { error: `Fill in “${f.label}”.` };
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
  await sendEmail({ to: teamInbox(), replyTo: d.email, subject: `Quote request: ${cfg.title} — ${d.business_name || d.name}`, text: `${d.description}\n\n${JSON.stringify(details, null, 2)}\n\nReview: ${env.siteUrl()}/admin/${session ? "services" : "leads"}` });
  await sendEmail({ to: d.email, subject: `We received your ${cfg.title} request`, text: `Hi ${d.name.split(" ")[0]}, thanks for your request. The Funding Lab Team will reply within one business day with next steps.` });
  return { ok: true };
}

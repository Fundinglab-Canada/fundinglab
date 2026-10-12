"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile, requireUser } from "@/lib/auth";
import { PLANS, isPlan } from "@/lib/plans";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";

/** Stripe Checkout (subscription mode) for Starter / Growth / Pro. Prices come from STRIPE_PRICE_* env vars. */
export async function startSubscription(formData: FormData) {
  const plan = String(formData.get("plan") ?? "");
  const session = await getSessionProfile();
  if (!session) redirect(`/signup?next=${encodeURIComponent(`/pricing?plan=${plan}`)}`);
  if (session.profile.role !== "business" && session.profile.role !== "admin") redirect("/pricing?error=Plans%20are%20for%20business%20accounts.");
  const def = PLANS.find((p) => p.id === plan);
  if (!isPlan(plan) || !def?.priceEnv) redirect("/pricing");
  const price = process.env[def.priceEnv];
  if (!price || !process.env.STRIPE_SECRET_KEY) redirect(`/pricing?error=${encodeURIComponent("Online sign-up for paid plans isn't open yet. Contact the Funding Lab Team and we'll set you up.")}`);

  const supabase = await createClient();
  const { data: sub } = await supabase.from("subscriptions").select("stripe_customer_id, stripe_subscription_id, status, plan").eq("user_id", session.userId).maybeSingle();
  // Existing subscribers change plans in the Customer Portal so Stripe handles proration.
  if (sub?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(sub.status)) return openBillingPortal();

  const checkout = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    ...(sub?.stripe_customer_id ? { customer: sub.stripe_customer_id } : { customer_email: session.profile.email ?? undefined }),
    client_reference_id: session.userId,
    metadata: { plan, user_id: session.userId },
    subscription_data: { metadata: { plan, user_id: session.userId } },
    allow_promotion_codes: true,
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    success_url: `${env.siteUrl()}/app/settings?billing=success`,
    cancel_url: `${env.siteUrl()}/pricing?plan=${plan}`,
  });
  redirect(checkout.url!);
}

/** Stripe Customer Portal: update card, change plan, cancel, invoices. */
export async function openBillingPortal() {
  const { userId } = await requireUser("/app/settings");
  const { data: sub } = await createAdminClient().from("subscriptions").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
  if (!sub?.stripe_customer_id) redirect("/pricing");
  const portal = await stripe().billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: `${env.siteUrl()}/app/settings` });
  redirect(portal.url);
}

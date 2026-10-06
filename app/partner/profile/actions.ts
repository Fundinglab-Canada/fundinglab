"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { parsePartnerForm } from "@/lib/partners/save";
import type { PartnerFormState } from "@/components/partner-form";
import { PARTNER_TIERS } from "@/lib/constants";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";

export async function updatePartnerProfile(_prev: PartnerFormState, formData: FormData): Promise<PartnerFormState> {
  const { userId } = await requireUser("/partner/profile");
  const parsed = parsePartnerForm(formData, false);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { data: p, error } = await supabase.from("partners").update(parsed.partner).eq("user_id", userId).select("id").single();
  if (error || !p) return { error: "We couldn't save your profile. Try again." };
  await supabase.from("partner_criteria").upsert({ partner_id: p.id, ...parsed.criteria, updated_at: new Date().toISOString() });
  redirect("/partner/profile?saved=1");
}

/** Optional partner membership tiers (Stripe subscription). Prices come from STRIPE_PRICE_PARTNER_* env vars. */
export async function startMembership(formData: FormData) {
  const { userId } = await requireUser("/partner");
  const tier = PARTNER_TIERS.find((t) => t.id === formData.get("tier"));
  const price = tier ? process.env[tier.priceEnv] : undefined;
  if (!tier || !price) redirect("/partner?membership=unavailable");
  const supabase = await createClient();
  const { data: partner } = await supabase.from("partners").select("id, contact_email, status").eq("user_id", userId).single();
  if (!partner || partner.status !== "active") redirect("/partner");
  const { data: order } = await supabase
    .from("service_orders")
    .insert({ kind: "partner_membership", status: "checkout_started", partner_id: partner.id, requested_by: userId, message: tier.name })
    .select("id")
    .single();
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer_email: partner.contact_email ?? undefined,
    client_reference_id: order?.id,
    metadata: { service_order_id: order?.id ?? "", tier: tier.id },
    subscription_data: { metadata: { partner_id: partner.id, tier: tier.id } },
    success_url: `${env.siteUrl()}/partner?membership=active`,
    cancel_url: `${env.siteUrl()}/partner?membership=cancelled`,
  });
  redirect(session.url!);
}

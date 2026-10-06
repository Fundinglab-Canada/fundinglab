import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMAIL_TEMPLATES, sendEmail } from "@/lib/email";
import { SERVICES } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, env.stripeWebhookSecret());
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  const db = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.service_order_id ?? session.client_reference_id;
      if (!orderId || session.payment_status === "unpaid") break;
      const { data: order } = await db
        .from("service_orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
          stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
          amount: session.amount_total != null ? session.amount_total / 100 : undefined,
        })
        .eq("id", orderId)
        .neq("status", "paid") // idempotent on Stripe retries
        .select("kind, partner_id")
        .maybeSingle();
      if (!order) break;
      if (order.kind === "partner_membership" && order.partner_id && session.metadata?.tier) {
        await db.from("partners").update({ membership_tier: session.metadata.tier }).eq("id", order.partner_id);
      }
      const email = session.customer_details?.email;
      const service = SERVICES.find((s) => s.kind === order.kind)?.name ?? "Funding Lab";
      if (email) await sendEmail({ to: email, ...EMAIL_TEMPLATES.service_paid({ service }) });
      const admin = process.env.ADMIN_NOTIFY_EMAIL;
      if (admin) await sendEmail({ to: admin, subject: `Paid: ${service}`, text: `Order ${orderId} was paid. ${env.siteUrl()}/admin/orders` });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: order } = await db.from("service_orders").select("partner_id").eq("stripe_subscription_id", sub.id).maybeSingle();
      if (order?.partner_id) await db.from("partners").update({ membership_tier: "standard" }).eq("id", order.partner_id);
      break;
    }
    default:
      break;
  }
  return NextResponse.json({ received: true });
}

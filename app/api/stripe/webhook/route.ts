import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMAIL_TEMPLATES, sendEmail } from "@/lib/email";
import { SERVICES } from "@/lib/constants";
import { teamInbox } from "@/lib/email";
import { cohortIcs, defaultSchedule, type CohortSession } from "@/lib/cohort";

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
      if (session.metadata?.cohort_enrollment_id) {
        if (session.payment_status !== "unpaid") await markEnrolled(db, session);
        break;
      }
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
      await sendEmail({ to: teamInbox(), subject: `Paid: ${service}`, text: `Order ${orderId} was paid. ${env.siteUrl()}/admin/services` });
      break;
    }
    case "checkout.session.expired": {
      // Release the held seat when an unpaid cohort checkout expires.
      const session = event.data.object as Stripe.Checkout.Session;
      const id = session.metadata?.cohort_enrollment_id;
      if (id) await db.from("cohort_enrollments").update({ status: "cancelled" }).eq("id", id).eq("status", "pending_payment");
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      if (pi && charge.refunded) await db.from("cohort_enrollments").update({ status: "refunded" }).eq("stripe_payment_id", pi);
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

type Db = ReturnType<typeof createAdminClient>;

async function markEnrolled(db: Db, session: Stripe.Checkout.Session) {
  const id = session.metadata!.cohort_enrollment_id;
  const { data: enr } = await db
    .from("cohort_enrollments")
    .update({
      status: "enrolled",
      stripe_checkout_session_id: session.id,
      stripe_payment_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      amount_paid: session.amount_total != null ? session.amount_total / 100 : null,
    })
    .eq("id", id)
    .in("status", ["pending_payment", "cancelled", "waitlisted"]) // idempotent on retries
    .select("cohort_id, user_id, intake")
    .maybeSingle();
  if (!enr) return;
  const [{ data: cohort }, { data: sessions }, { data: profile }] = await Promise.all([
    db.from("cohorts").select("name, start_date, join_url").eq("id", enr.cohort_id).single(),
    db.from("cohort_sessions").select("week_number, starts_at, topic").eq("cohort_id", enr.cohort_id).order("week_number"),
    db.from("profiles").select("email, full_name").eq("id", enr.user_id).single(),
  ]);
  if (!cohort) return;
  const schedule = (sessions?.length ? sessions : defaultSchedule(cohort.start_date)) as CohortSession[];
  const to = profile?.email ?? session.customer_details?.email;
  if (to) {
    await sendEmail({
      to,
      subject: `Welcome to Road to Funding — ${cohort.name}`,
      text: `Hi ${(profile?.full_name ?? "there").split(" ")[0]},\n\nYou're enrolled. The attached calendar file adds all 8 Friday sessions (8:00 AM PT).\n\n${schedule.map((s) => `Week ${s.week_number}: ${s.topic}`).join("\n")}\n\nYour cohort space: ${env.siteUrl()}/app/cohort`,
      attachments: [{ filename: "road-to-funding.ics", content: cohortIcs(cohort.name, schedule, cohort.join_url), contentType: "text/calendar" }],
    });
  }
  const intake = (enr.intake ?? {}) as { business_name?: string };
  await sendEmail({ to: teamInbox(), subject: `Cohort enrollment paid: ${intake.business_name ?? to}`, text: `${cohort.name}. ${env.siteUrl()}/admin/programs-education` });
}

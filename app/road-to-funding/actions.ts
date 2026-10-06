"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, getMyBusiness } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { sendEmail, teamInbox } from "@/lib/email";

const intake = z.object({
  cohort_id: z.string().uuid(),
  business_name: z.string().trim().min(2, "Enter your business name.").max(160),
  stage: z.string().max(40),
  goal: z.string().trim().min(5, "Tell us what you want from the cohort.").max(1000),
  amount_sought: z.coerce.number().min(0).max(1e10).optional(),
  challenge: z.string().trim().max(1000).optional(),
  coupon: z.string().trim().max(40).optional(),
  agree: z.literal("on", { errorMap: () => ({ message: "Accept the refund policy to continue." }) }),
});

export async function enrollCohort(_prev: { error?: string } | undefined, formData: FormData): Promise<{ error?: string }> {
  const { userId, profile } = await requireUser("/road-to-funding/enroll");
  const parsed = intake.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const db = createAdminClient();

  const { data: cohort } = await db.from("cohorts").select("id, name, price_cad, stripe_price_id, status, registration_deadline, start_date").eq("id", d.cohort_id).maybeSingle();
  if (!cohort || !["open", "full"].includes(cohort.status)) return { error: "Enrollment for this cohort is closed." };
  if (cohort.registration_deadline && new Date(`${cohort.registration_deadline}T23:59:59-08:00`).getTime() < Date.now()) return { error: "The registration deadline has passed." };

  const { data: existing } = await db.from("cohort_enrollments").select("id, status").eq("cohort_id", cohort.id).eq("user_id", userId).maybeSingle();
  if (existing?.status === "enrolled") redirect("/app/cohort");

  const { data: seats } = await db.rpc("fl_cohort_seats", { p_cohort: cohort.id });
  const left = (seats as { seats_left: number }[] | null)?.[0]?.seats_left ?? 0;
  const business = await getMyBusiness();
  const row = {
    cohort_id: cohort.id, user_id: userId, business_id: business?.id ?? null, coupon_code: d.coupon || null,
    intake: { business_name: d.business_name, stage: d.stage, goal: d.goal, amount_sought: d.amount_sought ?? null, challenge: d.challenge ?? null },
  };

  // Full (and this user doesn't already hold a pending seat): waitlist instead of charging.
  if (left <= 0 && existing?.status !== "pending_payment") {
    await db.from("cohort_enrollments").upsert({ ...row, status: "waitlisted" }, { onConflict: "cohort_id,user_id" });
    await sendEmail({ to: profile.email!, subject: `You're on the waitlist: ${cohort.name}`, text: "This cohort is full. We'll email you if a seat opens or when the next cohort opens." });
    redirect("/road-to-funding?status=waitlisted");
  }

  const { data: enrollment, error } = await db
    .from("cohort_enrollments").upsert({ ...row, status: "pending_payment", created_at: new Date().toISOString() }, { onConflict: "cohort_id,user_id" }).select("id").single();
  if (error || !enrollment) return { error: "We couldn't start your enrollment. Try again." };

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    currency: "cad",
    line_items: cohort.stripe_price_id
      ? [{ price: cohort.stripe_price_id, quantity: 1 }]
      : [{ quantity: 1, price_data: { currency: "cad", unit_amount: Math.round(Number(cohort.price_cad) * 100), product_data: { name: `Road to Funding — ${cohort.name}`, description: "8-week live funding-readiness cohort" } } }],
    allow_promotion_codes: true,
    customer_email: profile.email ?? undefined,
    client_reference_id: enrollment.id,
    metadata: { cohort_enrollment_id: enrollment.id, cohort_id: cohort.id },
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // seat is held for 1 hour
    success_url: `${env.siteUrl()}/app/cohort?status=paid`,
    cancel_url: `${env.siteUrl()}/road-to-funding?status=cancelled`,
  });
  await db.from("cohort_enrollments").update({ stripe_checkout_session_id: session.id }).eq("id", enrollment.id);
  await sendEmail({ to: teamInbox(), subject: `Cohort checkout started: ${d.business_name}`, text: `${cohort.name}\n${d.goal}` });
  redirect(session.url!);
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyBusiness, requireUser } from "@/lib/auth";
import { SERVICES, type ServiceKind } from "@/lib/constants";
import { quoteSchema } from "@/lib/validation";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email";

async function createOrder(formData: FormData, status: "quote_requested" | "checkout_started") {
  const { userId } = await requireUser("/services");
  const parsed = quoteSchema.parse({ kind: formData.get("kind"), message: formData.get("message") ?? undefined });
  const service = SERVICES.find((s) => s.kind === parsed.kind)!;
  const business = await getMyBusiness();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_orders")
    .insert({
      kind: service.kind,
      status,
      message: parsed.message ?? null,
      amount: service.priceCents / 100,
      business_id: business?.id ?? null,
      requested_by: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not create the order: ${error.message}`);
  return { orderId: data.id as string, service, business };
}

export async function requestQuote(formData: FormData) {
  const { service } = await createOrder(formData, "quote_requested");
  const admin = process.env.ADMIN_NOTIFY_EMAIL;
  if (admin) {
    const t = EMAIL_TEMPLATES.quote_requested({ service: service.name, url: `${env.siteUrl()}/admin/orders` });
    await sendEmail({ to: admin, ...t });
  }
  redirect("/services?status=quote");
}

export async function checkoutService(formData: FormData) {
  const { orderId, service, business } = await createOrder(formData, "checkout_started");
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    currency: "cad",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: service.priceCents,
          product_data: { name: `${service.name} — deposit`, description: "Final scope confirmed by a Funding Lab expert." },
        },
      },
    ],
    customer_email: business?.contact_email ?? undefined,
    client_reference_id: orderId,
    metadata: { service_order_id: orderId, kind: service.kind satisfies ServiceKind },
    automatic_tax: { enabled: false },
    success_url: `${env.siteUrl()}/services?status=paid`,
    cancel_url: `${env.siteUrl()}/services?status=cancelled`,
  });
  // Owners can't update orders under RLS; record the session id with the service role (order id came from our insert).
  await createAdminClient().from("service_orders").update({ stripe_checkout_session_id: session.id }).eq("id", orderId);
  redirect(session.url!);
}

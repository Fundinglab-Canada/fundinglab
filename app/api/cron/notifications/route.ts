import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMAIL_TEMPLATES, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";

/**
 * Drains the notifications outbox (rows written by fl_notify in the database) into email.
 * Scheduled by .github/workflows/cron.yml every 5 minutes. Protected by CRON_SECRET (sent as a Bearer token).
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const { data: pending } = await db
    .from("notifications")
    .select("id, recipient_email, kind, payload")
    .is("emailed_at", null)
    .not("recipient_email", "is", null)
    .order("created_at")
    .limit(50);

  let sent = 0;
  for (const n of pending ?? []) {
    const tpl = EMAIL_TEMPLATES[n.kind];
    if (tpl) {
      const { subject, text } = tpl(n.payload ?? {});
      const ok = await sendEmail({ to: n.recipient_email!, subject, text: `${text}\n\n${env.siteUrl()}${n.kind === "opportunity_curated" || n.kind === "partner_approved" ? "/partner" : "/app"}` });
      if (!ok) continue;
      sent++;
    }
    await db.from("notifications").update({ emailed_at: new Date().toISOString() }).eq("id", n.id);
  }
  return NextResponse.json({ processed: pending?.length ?? 0, sent });
}

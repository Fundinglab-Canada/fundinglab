import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMAIL_TEMPLATES, sendEmail, sendSms } from "@/lib/email";
import { env } from "@/lib/env";
import { ptString, webinarGoogleUrl, webinarIcs } from "@/lib/webinar";
import { alertDue, programDeadline } from "@/lib/programs/match";
import { hasFeature, isPlan } from "@/lib/plans";
import { dateShort } from "@/lib/format";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Hourly jobs (.github/workflows/cron.yml, minute 7). Protected by CRON_SECRET.
 * 1. Keep 8 weeks of Tuesday webinar sessions scheduled.
 * 2. Webinar reminders: 24 h and 1 h before (email; SMS if opted in), follow-up with replay 2 h after.
 * 3. Expire unanswered introductions (14 days) and send the day-7 reminder.
 * 4. Release unpaid cohort seats after 2 hours.
 * 5. Purge job applications past their 12-month retention, including stored files.
 * 6. Saved-program deadline alerts 30 / 14 / 3 days before intake close (Starter and up; email, SMS if opted in).
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const now = Date.now();
  const report: Record<string, number | string> = {};

  await db.rpc("fl_ensure_webinar_sessions", { p_weeks: 8 });

  // --- Webinar reminders -------------------------------------------------------------------
  const { data: sessions } = await db
    .from("webinar_sessions")
    .select("id, starts_at, duration_minutes, topic, join_url, replay_url, status")
    .gte("starts_at", new Date(now - 6 * 36e5).toISOString())
    .lte("starts_at", new Date(now + 25 * 36e5).toISOString())
    .neq("status", "cancelled");
  let reminded = 0;
  for (const s of sessions ?? []) {
    const startsIn = new Date(s.starts_at).getTime() - now;
    const when = ptString(s.starts_at);
    const window = startsIn > 0 && startsIn <= 24 * 36e5 ? (startsIn <= 75 * 6e4 ? "1h" : startsIn >= 22 * 36e5 ? "24h" : null) : null;
    const after = startsIn < -(s.duration_minutes * 6e4 + 60 * 6e4); // ~1 h after it ends
    const col = window === "24h" ? "reminded_24h_at" : window === "1h" ? "reminded_1h_at" : after ? "followup_sent_at" : null;
    if (!col) continue;
    const { data: regs } = await db.from("webinar_registrations").select("id, name, email, phone, sms_opt_in").eq("session_id", s.id).is(col, null).limit(500);
    for (const r of regs ?? []) {
      const first = r.name.split(" ")[0];
      if (col === "followup_sent_at") {
        await sendEmail({
          to: r.email,
          subject: "Thanks for joining the Funding Webinar",
          text: `Hi ${first}, thanks for registering for the Funding Webinar (${when}).\n\n${s.replay_url ? `Watch the replay (free account): ${env.siteUrl()}/webinar` : "The replay will be available to members on the webinar page."}\n\nNext steps:\n• Take the free readiness assessment: ${env.siteUrl()}/assessment\n• Want structured help? The 8-week Road to Funding cohort: ${env.siteUrl()}/road-to-funding`,
        });
      } else {
        await sendEmail({
          to: r.email,
          subject: window === "1h" ? "Starting in 1 hour: Funding Webinar" : "Tomorrow: Funding Webinar",
          text: `Hi ${first}, a reminder that the Funding Webinar starts ${when}.\nTopic: ${s.topic}\n\n${s.join_url ? `Join: ${s.join_url}` : "Your join link will follow shortly."}\nAdd to calendar: ${webinarGoogleUrl(s)}`,
          attachments: window === "24h" ? [{ filename: "funding-lab-webinar.ics", content: webinarIcs(s), contentType: "text/calendar" }] : undefined,
        });
        if (r.sms_opt_in && r.phone) await sendSms(r.phone, `Funding Lab webinar ${window === "1h" ? "starts in 1 hour" : "is tomorrow"}: ${when}.${s.join_url ? ` ${s.join_url}` : ""}`);
      }
      await db.from("webinar_registrations").update({ [col]: new Date().toISOString() }).eq("id", r.id);
      reminded++;
    }
    if (after && s.status === "scheduled") await db.from("webinar_sessions").update({ status: "completed" }).eq("id", s.id);
  }
  report.webinar_messages = reminded;

  // --- Introductions: expire + day-7 reminders --------------------------------------------
  const { data: due } = await db.rpc("fl_expire_and_remind_matches");
  const ids = [...new Set(((due ?? []) as { business_owner: string | null; partner_user: string | null }[]).flatMap((d) => [d.business_owner, d.partner_user]).filter(Boolean))] as string[];
  if (ids.length) {
    const { data: people } = await db.from("profiles").select("id, email").in("id", ids);
    const t = EMAIL_TEMPLATES.introduction_reminder({});
    for (const p of people ?? []) if (p.email) await sendEmail({ to: p.email, subject: t.subject, text: `${t.text}\n\n${env.siteUrl()}/app/matches` });
  }
  report.intro_reminders = ids.length;

  // --- Cohort seats ------------------------------------------------------------------------
  const { data: released } = await db.rpc("fl_release_stale_checkouts");
  report.seats_released = Number(released ?? 0);

  // --- Careers retention -------------------------------------------------------------------
  const today = new Date().toISOString().slice(0, 10);
  const { data: expired } = await db.from("job_applications").select("id, resume_path, cover_letter_path").lt("retain_until", today).limit(200);
  const files = (expired ?? []).flatMap((a) => [a.resume_path, a.cover_letter_path]).filter(Boolean) as string[];
  if (files.length) await db.storage.from("careers").remove(files);
  if (expired?.length) await db.from("job_applications").delete().in("id", expired.map((a) => a.id));
  report.applications_purged = expired?.length ?? 0;

  // --- Program deadline alerts ---------------------------------------------------------------
  report.program_alerts = await programAlerts(db, new Date(now));

  return NextResponse.json({ ok: true, ...report });
}

type Db = ReturnType<typeof createAdminClient>;

async function programAlerts(db: Db, now: Date): Promise<number> {
  const horizon = new Date(now.getTime() + 31 * 864e5).toISOString();
  const { data: rows } = await db
    .from("saved_programs")
    .select("business_id, program_id, alerts_sent, programs!inner(name, slug, close_at, intake_close, rolling, active), businesses!inner(name, owner_id)")
    .eq("alert_enabled", true)
    .eq("programs.active", true)
    .or(`close_at.lte.${horizon},intake_close.lte.${horizon}`, { referencedTable: "programs" })
    .limit(1000);
  if (!rows?.length) return 0;

  const owners = [...new Set(rows.map((r) => (r.businesses as unknown as { owner_id: string }).owner_id))];
  const [{ data: people }, { data: subs }, { data: cohorts }] = await Promise.all([
    db.from("profiles").select("id, email, full_name, phone, sms_opt_in, role").in("id", owners),
    db.from("subscriptions").select("user_id, plan, status").in("user_id", owners),
    db.from("cohort_enrollments").select("user_id, cohorts!inner(end_date)").in("user_id", owners).eq("status", "enrolled"),
  ]);
  const today = now.toISOString().slice(0, 10);
  const planOf = (uid: string) => {
    const s = (subs ?? []).find((x) => x.user_id === uid);
    const paid = s && ["active", "trialing", "past_due"].includes(s.status) && isPlan(s.plan) ? s.plan : "free";
    const inCohort = (cohorts ?? []).some((c) => c.user_id === uid && (c.cohorts as unknown as { end_date: string }).end_date >= today);
    return inCohort && !hasFeature(paid, "data_room") ? "growth" : paid;
  };

  let sent = 0;
  for (const r of rows) {
    const p = r.programs as unknown as { name: string; slug: string; close_at: string | null; intake_close: string | null; rolling: boolean };
    const b = r.businesses as unknown as { name: string; owner_id: string };
    const deadline = programDeadline(p);
    if (!deadline || p.rolling) continue;
    const due = alertDue(deadline, (r.alerts_sent as number[]) ?? [], now);
    if (!due) continue;
    const person = (people ?? []).find((x) => x.id === b.owner_id);
    if (!person?.email || !hasFeature(person.role === "admin" ? "pro" : planOf(person.id), "program_alerts")) continue;
    const days = Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / 864e5));
    const link = `${env.siteUrl()}/app/grants/${p.slug}`;
    await sendEmail({
      to: person.email,
      subject: `${days} day${days === 1 ? "" : "s"} left: ${p.name}`,
      text: `Hi ${(person.full_name ?? "there").split(" ")[0]},\n\n${p.name} closes ${dateShort(deadline)} (${days} day${days === 1 ? "" : "s"} from now). You saved it for ${b.name}.\n\nCheck your documents and application: ${link}\n\nNeed help finishing it? Reply to book a grant writer.`,
    });
    if (person.sms_opt_in && person.phone) await sendSms(person.phone, `Funding Lab: ${p.name} closes in ${days} day${days === 1 ? "" : "s"} (${dateShort(deadline)}). ${link}`);
    await db.from("saved_programs").update({ alerts_sent: [...new Set([...((r.alerts_sent as number[]) ?? []), ...due.markSent])] })
      .eq("business_id", r.business_id).eq("program_id", r.program_id);
    sent++;
  }
  return sent;
}

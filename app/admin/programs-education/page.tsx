import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dateShort } from "@/lib/format";
import { RowForm } from "@/components/admin/row-form";
import { AdminNotice } from "@/components/admin/notice";
import { ensureWebinarSessions, setAttendance, setEnrollmentStatus } from "../actions";

export const metadata = { title: "Webinar & cohorts" };
const pt = (iso: string) => new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Vancouver" }) + " PT";
const ENROLL = ["pending_payment", "enrolled", "waitlisted", "refunded", "transferred", "completed", "cancelled"];

export default async function EducationAdmin({ searchParams }: { searchParams: Promise<{ session?: string; cohort?: string; edit?: string; saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: sessions }, { data: regs }, { data: cohorts }] = await Promise.all([
    supabase.from("webinar_sessions").select("*").gte("starts_at", new Date(Date.now() - 30 * 864e5).toISOString()).order("starts_at").limit(20),
    supabase.from("webinar_registrations").select("session_id"),
    supabase.from("cohorts").select("*").order("start_date", { ascending: false }),
  ]);
  const regCount = (id: string) => (regs ?? []).filter((r) => r.session_id === id).length;
  const editSession = sessions?.find((s) => s.id === sp.session);
  const cohort = sp.cohort === "new" ? null : cohorts?.find((c) => c.id === sp.cohort) ?? cohorts?.[0];
  const [{ data: enrollments }, { data: cSessions }, { data: attendance }] = cohort
    ? await Promise.all([
        supabase.from("cohort_enrollments").select("id, status, amount_paid, intake, created_at, profiles:user_id(full_name, email)").eq("cohort_id", cohort.id).order("created_at"),
        supabase.from("cohort_sessions").select("id, week_number, starts_at, topic").eq("cohort_id", cohort.id).order("week_number"),
        supabase.from("cohort_attendance").select("session_id, enrollment_id, attended, homework_done"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const att = new Map((attendance ?? []).map((a) => [`${a.session_id}:${a.enrollment_id}`, a]));
  const enrolled = (enrollments ?? []).filter((e) => ["enrolled", "completed"].includes(e.status));

  return (
    <>
      <h1 className="text-3xl font-bold">Webinar &amp; cohorts</h1>
      <AdminNotice sp={sp} />

      <section className="card flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Funding Webinar sessions (Tuesdays 8:00 AM PT)</h2>
          <div className="flex gap-2"><form action={ensureWebinarSessions}><button className="btn-secondary btn-sm">Create next 8 weeks</button></form><a href="/api/admin/export/webinar" className="btn-ghost btn-sm">All registrants CSV</a></div></div>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>When</th><th>Topic</th><th>Status</th><th className="text-right">Registered</th><th /></tr></thead>
          <tbody>{(sessions ?? []).map((s) => (
            <tr key={s.id}><td className="whitespace-nowrap">{pt(s.starts_at)}</td><td className="text-[13px]">{s.topic}{!s.join_url && s.status === "scheduled" && <span className="pill-warning ml-2">No join link</span>}</td>
              <td><span className="pill">{s.status}</span></td><td className="n">{regCount(s.id)}</td>
              <td className="whitespace-nowrap text-right"><Link href={`?session=${s.id}`} className="btn-ghost btn-sm">Edit</Link><a href={`/api/admin/export/webinar?session=${s.id}`} className="btn-ghost btn-sm">CSV</a></td></tr>
          ))}</tbody>
        </table></div>
        {editSession && <div className="border-t border-line pt-3"><h3 className="mb-2 font-bold">Edit session · {pt(editSession.starts_at)}</h3><RowForm table="webinar_sessions" row={editSession} back="/admin/programs-education" /></div>}
      </section>

      <section className="card flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Road to Funding cohorts</h2>
          <div className="flex flex-wrap gap-1">{(cohorts ?? []).map((c) => <Link key={c.id} href={`?cohort=${c.id}`} className={c.id === cohort?.id ? "pill-success" : "pill"}>{c.name}</Link>)}<Link href="?cohort=new" className="btn-primary btn-sm">New cohort</Link></div></div>
        {sp.cohort === "new" ? (
          <RowForm table="cohorts" row={{ status: "draft", price_cad: 499, capacity: 25 }} back="/admin/programs-education" />
        ) : cohort ? (
          <>
            <details><summary className="cursor-pointer text-sm font-semibold text-ink">Edit {cohort.name} · {dateShort(cohort.start_date)} · {enrolled.length}/{cohort.capacity} enrolled</summary>
              <div className="mt-3"><RowForm table="cohorts" row={cohort} back={`/admin/programs-education?cohort=${cohort.id}`} deletable={false} /></div></details>
            <h3 className="font-bold">Enrollments</h3>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Member</th><th>Goal</th><th>Paid</th><th>Status</th></tr></thead>
              <tbody>{(enrollments ?? []).map((e) => {
                const p = (Array.isArray(e.profiles) ? e.profiles[0] : e.profiles) as { full_name: string | null; email: string | null } | null;
                const intake = (e.intake ?? {}) as { business_name?: string; goal?: string };
                return (
                  <tr key={e.id}><td><b className="text-ink">{p?.full_name ?? p?.email}</b><div className="text-[13px] text-subtle">{intake.business_name} · {p?.email}</div></td>
                    <td className="max-w-[260px] text-[13px]">{intake.goal}</td><td className="n">{e.amount_paid ? `$${e.amount_paid}` : "—"}</td>
                    <td><form action={setEnrollmentStatus} className="flex gap-1"><input type="hidden" name="id" value={e.id} />
                      <select name="status" defaultValue={e.status} className="input w-auto py-1 text-[13px]">{ENROLL.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select><button className="btn-ghost btn-sm">Save</button></form></td></tr>
                );
              })}</tbody>
            </table></div>
            {enrolled.length > 0 && (cSessions ?? []).length > 0 && (
              <>
                <h3 className="font-bold">Attendance</h3>
                <div className="table-wrap"><table className="table text-[13px]">
                  <thead><tr><th>Member</th>{(cSessions ?? []).map((s) => <th key={s.id} title={s.topic}>W{s.week_number}</th>)}</tr></thead>
                  <tbody>{enrolled.map((e) => {
                    const p = (Array.isArray(e.profiles) ? e.profiles[0] : e.profiles) as { full_name: string | null; email: string | null } | null;
                    return (
                      <tr key={e.id}><td>{p?.full_name ?? p?.email}</td>
                        {(cSessions ?? []).map((s) => {
                          const a = att.get(`${s.id}:${e.id}`);
                          return (
                            <td key={s.id}><form action={setAttendance}><input type="hidden" name="session_id" value={s.id} /><input type="hidden" name="enrollment_id" value={e.id} />
                              <input type="hidden" name="attended" value={a?.attended ? "0" : "1"} />
                              <button className={a?.attended ? "pill-success" : "pill"} title={a?.homework_done ? "Homework done" : undefined}>{a?.attended ? "✓" : "–"}{a?.homework_done ? "·H" : ""}</button></form></td>
                          );
                        })}</tr>
                    );
                  })}</tbody>
                </table></div>
              </>
            )}
          </>
        ) : <p className="text-subtle">No cohorts yet.</p>}
      </section>
    </>
  );
}

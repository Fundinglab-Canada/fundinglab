import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { EventTime } from "@/components/local-time";
import { dateShort } from "@/lib/format";

export const metadata = { title: "My cohort" };

async function post(formData: FormData) {
  "use server";
  const { userId } = await requireUser("/app/cohort");
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  const cohortId = String(formData.get("cohort_id"));
  if (!body) return;
  const supabase = await createClient();
  await supabase.from("cohort_posts").insert({ cohort_id: cohortId, author_id: userId, body }); // RLS: members only
  revalidatePath("/app/cohort");
}

async function toggleHomework(formData: FormData) {
  "use server";
  await requireUser("/app/cohort");
  const supabase = await createClient();
  await supabase.rpc("fl_set_homework", { p_session: String(formData.get("session_id")), p_done: formData.get("done") === "1" });
  revalidatePath("/app/cohort");
}

export default async function CohortPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { userId } = await requireUser("/app/cohort");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: enr } = await supabase
    .from("cohort_enrollments").select("id, status, cohort_id, cohorts(name, start_date, end_date, join_url)")
    .eq("user_id", userId).in("status", ["enrolled", "completed", "waitlisted", "pending_payment"]).order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (!enr || enr.status === "pending_payment" || enr.status === "waitlisted") {
    return (
      <section className="container flex max-w-3xl flex-col gap-4 py-10">
        {sp.status === "paid" && <p className="pill-info self-start px-4 py-2 text-sm">Payment received. Confirming your seat — refresh in a moment.</p>}
        <h1 className="text-3xl font-bold">Road to Funding</h1>
        <p className="text-subtle">{enr?.status === "waitlisted" ? "You're on the waitlist. We'll email you if a seat opens." : "You're not enrolled in a cohort yet."}</p>
        <Link href="/road-to-funding" className="btn-secondary self-start">See the next cohort</Link>
      </section>
    );
  }
  const cohort = (Array.isArray(enr.cohorts) ? enr.cohorts[0] : enr.cohorts) as { name: string; start_date: string; end_date: string; join_url: string | null };
  const [{ data: sessions }, { data: attendance }, { data: posts }] = await Promise.all([
    supabase.from("cohort_sessions").select("id, week_number, starts_at, topic, replay_url, materials, homework").eq("cohort_id", enr.cohort_id).order("week_number"),
    supabase.from("cohort_attendance").select("session_id, attended, homework_done").eq("enrollment_id", enr.id),
    supabase.from("cohort_posts").select("id, body, created_at, author_id").eq("cohort_id", enr.cohort_id).order("created_at", { ascending: false }).limit(30),
  ]);
  const att = new Map((attendance ?? []).map((a) => [a.session_id, a]));
  const next = (sessions ?? []).find((s) => new Date(s.starts_at).getTime() > Date.now() - 2 * 36e5);

  return (
    <section className="container flex max-w-4xl flex-col gap-6 py-10">
      {sp.status === "paid" && <p className="pill-success self-start px-4 py-2 text-sm" role="status">You&apos;re enrolled. Check your email for the calendar invites.</p>}
      <div>
        <span className="eyebrow">Road to Funding</span>
        <h1 className="mt-1 text-3xl font-bold">{cohort.name}</h1>
        <p className="text-subtle">{dateShort(cohort.start_date)} – {dateShort(cohort.end_date)} · Fridays 8:00 AM PT</p>
      </div>
      {next && (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <span><span className="text-sm text-subtle">Next session · Week {next.week_number}</span><b className="block text-ink">{next.topic}</b><span className="text-sm"><EventTime iso={next.starts_at} /></span></span>
          {cohort.join_url && <a href={cohort.join_url} target="_blank" rel="noopener noreferrer" className="btn-cta">Join live</a>}
        </div>
      )}
      <div className="card flex flex-col gap-2">
        <h2 className="text-lg font-bold">Sessions</h2>
        <ol className="flex flex-col">
          {(sessions ?? []).map((s) => {
            const a = att.get(s.id);
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3 first:border-0">
                <span><b className="text-ink">Week {s.week_number}: {s.topic}</b><span className="block text-sm text-subtle"><EventTime iso={s.starts_at} /></span></span>
                <span className="flex flex-wrap items-center gap-2">
                  {a?.attended && <span className="pill-success">Attended</span>}
                  {s.replay_url && <a href={s.replay_url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">Replay</a>}
                  <form action={toggleHomework}>
                    <input type="hidden" name="session_id" value={s.id} />
                    <input type="hidden" name="done" value={a?.homework_done ? "0" : "1"} />
                    <button className={a?.homework_done ? "pill-success" : "btn-secondary btn-sm"}>{a?.homework_done ? "Homework done ✓" : "Mark homework done"}</button>
                  </form>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="card flex flex-col gap-3">
        <h2 className="text-lg font-bold">Cohort discussion</h2>
        <form action={post} className="flex flex-col gap-2">
          <input type="hidden" name="cohort_id" value={enr.cohort_id} />
          <label className="field">Share a question or a win<textarea name="body" rows={2} maxLength={4000} required className="input" /></label>
          <button className="btn-secondary btn-sm self-start">Post</button>
        </form>
        <ul className="flex flex-col">
          {(posts ?? []).map((p) => (
            <li key={p.id} className="border-t border-line py-2">
              <span className="text-[13px] text-subtle">{p.author_id === userId ? "You" : "Cohort member"} · {dateShort(p.created_at)}</span>
              <p className="whitespace-pre-line text-body">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/auth";
import { hasFeature } from "@/lib/plans";
import { APP_STATUSES, DECLINE_FIXES, DECLINE_REASONS, appTypeLabel, checklistProgress, type ChecklistItem } from "@/lib/applications";
import { dateShort, money } from "@/lib/format";
import { rankPrograms } from "@/lib/programs/match";
import type { ProgramRow } from "@/lib/programs/types";
import { addChecklistItem, deleteApplication, toggleChecklistItem, updateApplication } from "../actions";

export const metadata = { title: "Application" };

export default async function ApplicationDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ set?: string; error?: string; saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { business, plan } = await requireBusinessContext(`/app/applications/${id}`);
  if (!hasFeature(plan, "applications")) redirect("/pricing?plan=starter");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: a } = await supabase.from("applications").select("*, programs(slug, name)").eq("id", id).maybeSingle();
  if (!a) notFound();
  const checklist = a.checklist as ChecklistItem[];
  const progress = checklistProgress(checklist);
  const status = sp.set && APP_STATUSES.some((s) => s.id === sp.set) ? sp.set : a.status;
  const declined = status === "declined";
  const reasonKey = (a.decline_reason ?? "").split(":")[0];

  const [{ data: docs }, { data: obligations }, alternatives] = await Promise.all([
    supabase.from("documents").select("id, file_name").eq("business_id", business.id),
    supabase.from("obligations").select("id, type, title, due_date, recurrence, status").eq("application_id", a.id).order("due_date"),
    a.status === "declined" || declined
      ? supabase.from("programs").select("*").eq("active", true).then(({ data }) =>
          rankPrograms(((data ?? []) as ProgramRow[]).filter((p) => p.id !== a.program_id), business)
            .filter((r) => !r.match.blocked && !r.match.closed).slice(0, 3))
      : Promise.resolve([]),
  ]);
  const docName = new Map((docs ?? []).map((d) => [d.id as string, d.file_name as string]));
  const program = a.programs as { slug: string; name: string } | null;
  const expert = a.type === "loan" ? { kind: "loan_consulting", label: "Loan Consulting" } : a.type === "grant" ? { kind: "grant_writing", label: "Grant Writing" } : { kind: "pitch_deck", label: "Pitch Deck review" };

  return (
    <section className="container flex max-w-5xl flex-col gap-6 py-10">
      <Link href="/app/applications" className="text-sm text-subtle hover:underline">← Application Center</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">{appTypeLabel(a.type)}</span>
          <h1 className="mt-1 text-3xl font-bold">{a.title}</h1>
          <p className="text-subtle">{a.provider ?? "—"}{program && <> · <Link href={`/app/grants/${program.slug}`} className="underline">program details</Link></>}</p>
        </div>
        <span className={a.status === "approved" ? "pill-success" : a.status === "declined" ? "pill-danger" : "pill-info"}>{APP_STATUSES.find((s) => s.id === a.status)?.label}</span>
      </div>
      {sp.error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{sp.error}</p>}
      {sp.saved && <p className="pill-success self-start px-4 py-2 text-sm" role="status">Saved.</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <form action={updateApplication} className="card grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={a.id} />
          <label className="field sm:col-span-2">Name<input name="title" defaultValue={a.title} required minLength={2} maxLength={200} className="input" /></label>
          <label className="field">Funder / lender / investor<input name="provider" defaultValue={a.provider ?? ""} maxLength={200} className="input" /></label>
          <label className="field">Status<select name="status" defaultValue={status} className="input">{APP_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          <label className="field">Amount requested<input name="amount_requested" type="number" min={0} step={1000} defaultValue={a.amount_requested ?? ""} className="input num" /></label>
          <label className="field">Amount approved<input name="amount_approved" type="number" min={0} step={1000} defaultValue={a.amount_approved ?? ""} className="input num" /><span className="help">Used for your funding history when approved.</span></label>
          <label className="field">Due date<input name="due_date" type="date" defaultValue={a.due_date ?? ""} className="input" /></label>
          <label className="field">If declined, why?
            <select name="decline_reason" defaultValue={reasonKey || (declined ? "" : "")} className="input">
              <option value="">—</option>{DECLINE_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="field sm:col-span-2">Notes<textarea name="notes" defaultValue={a.notes ?? ""} rows={4} maxLength={5000} className="input" placeholder="Program officer contacts, questions, draft answers…" /></label>
          {status === "approved" && a.status !== "approved" && (
            <p className="rounded-md bg-brand-soft px-3 py-2 text-sm text-brand-text sm:col-span-2">Saving as Approved adds this funding to your history and creates reporting, claim or payment deadlines.</p>
          )}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button className="btn-primary">Save</button>
            {a.submitted_at && <span className="self-center text-sm text-subtle">Submitted {dateShort(a.submitted_at)}</span>}
            {a.decision_at && <span className="self-center text-sm text-subtle">· Decision {dateShort(a.decision_at)}</span>}
          </div>
        </form>

        <div className="flex flex-col gap-4">
          <div className="card flex flex-col gap-3">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Checklist</h2><span className="num text-sm text-subtle">{progress.done}/{progress.total}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full bg-brand" style={{ width: `${progress.pct}%` }} /></div>
            <ul className="flex flex-col gap-1.5">
              {checklist.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-sm">
                  <form action={toggleChecklistItem}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="item" value={c.id} />
                    <button aria-label={c.done ? `Mark "${c.label}" not done` : `Mark "${c.label}" done`} className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${c.done ? "border-brand bg-brand text-on-brand" : "border-line-strong"}`}>{c.done ? "✓" : ""}</button>
                  </form>
                  <span className="flex flex-col">
                    <span className={c.done ? "text-subtle line-through" : "text-ink"}>{c.label}</span>
                    {c.document_id && docName.has(c.document_id) && <Link href="/app/prep/data-room" className="text-[12px] text-brand-text underline">{docName.get(c.document_id)}</Link>}
                  </span>
                </li>
              ))}
            </ul>
            <form action={addChecklistItem} className="flex gap-2"><input type="hidden" name="id" value={a.id} />
              <input name="label" placeholder="Add an item" className="input py-1.5" maxLength={200} aria-label="New checklist item" /><button className="btn-secondary btn-sm">Add</button></form>
            <Link href="/app/prep/data-room" className="text-sm font-semibold text-brand-text underline">Upload files to your data room</Link>
          </div>

          <div className="card flex flex-col items-start gap-2">
            <h2 className="text-lg font-bold">Expert review</h2>
            <p className="text-sm text-body">Have a Funding Lab expert review the package before you submit.</p>
            <Link href={`/services/${expert.kind}?from=application`} className="btn-secondary btn-sm">Get {expert.label}</Link>
          </div>
        </div>
      </div>

      {(a.status === "declined" || declined) && (
        <div className="card flex flex-col gap-4">
          <h2 className="text-xl font-bold">What to do next</h2>
          {reasonKey && DECLINE_FIXES[reasonKey] ? (
            <ul className="list-disc pl-5 text-sm">{DECLINE_FIXES[reasonKey].map((f) => <li key={f}>{f}</li>)}</ul>
          ) : <p className="text-sm text-subtle">Choose a decline reason above to see specific fixes.</p>}
          {alternatives.length > 0 && (
            <div>
              <b className="text-ink">Programs to try instead</b>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                {alternatives.map(({ program: p, match }) => (
                  <Link key={p.id} href={`/app/grants/${p.slug}`} className="flex flex-col gap-1 rounded-lg border border-line p-3 hover:border-brand">
                    <b className="text-ink">{p.name}</b><span className="text-[13px] text-subtle">{p.funder}</span>
                    <span className="mt-auto text-sm"><b className="num text-brand-text">{match.score}</b> match</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {a.status === "approved" && (
        <div className="card flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">Approved: {money(a.amount_approved ?? a.amount_requested)}</h2>
            <Link href="/app/profile?step=4" className="text-sm font-semibold text-brand-text underline">Added to your funding history</Link>
          </div>
          {obligations?.length ? (
            <>
              <p className="text-sm text-subtle">We set up these deadlines from typical program terms. Adjust them to match your agreement.</p>
              <div className="table-wrap"><table className="table"><thead><tr><th>Obligation</th><th>Due</th><th>Repeats</th></tr></thead>
                <tbody>{obligations.map((o) => <tr key={o.id}><td>{o.title}</td><td className="num">{dateShort(o.due_date)}</td><td>{o.recurrence ?? "—"}</td></tr>)}</tbody></table></div>
            </>
          ) : null}
          <Link href="/services/hiring?from=funded" className="text-sm font-semibold text-brand-text underline">Put your funding to work: hiring, development and marketing</Link>
        </div>
      )}

      {a.status !== "approved" && (
        <form action={deleteApplication} className="self-start"><input type="hidden" name="id" value={a.id} /><button className="btn-ghost btn-sm text-danger">Delete application</button></form>
      )}
    </section>
  );
}

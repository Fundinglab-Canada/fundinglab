import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/auth";
import { hasFeature } from "@/lib/plans";
import { APP_TYPES, checklistProgress, type AppStatus, type ChecklistItem } from "@/lib/applications";
import { money } from "@/lib/format";
import { ApplicationBoard, type BoardCard } from "@/components/app/application-board";
import { UpgradeCard } from "@/components/app/upgrade-card";
import { createApplication } from "./actions";

export const metadata = { title: "Application Center" };

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ new?: string; error?: string }> }) {
  const { business, plan } = await requireBusinessContext("/app/applications");
  const sp = await searchParams;
  const head = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <span className="eyebrow">Application Center</span>
        <h1 className="mt-1 text-3xl font-bold">Every application, one board</h1>
        <p className="max-w-measure text-subtle">Track grants, loans and investor rounds from planning to decision. Checklists link to your data room. When something is approved, we add it to your funding history and set up the reporting and claim deadlines.</p>
      </div>
      {hasFeature(plan, "applications") && <a href="#new" className="btn-primary">New application</a>}
    </div>
  );
  if (!hasFeature(plan, "applications")) {
    return (
      <section className="container flex flex-col gap-6 py-10">{head}
        <UpgradeCard feature="applications" title="The Application Center is part of Starter">Kanban tracking, document checklists from each program&apos;s requirements, deadline tracking, and automatic funding history and obligations when you&apos;re approved.</UpgradeCard>
      </section>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.from("applications")
    .select("id, title, type, provider, status, amount_requested, amount_approved, due_date, checklist, position")
    .eq("business_id", business.id).order("position", { ascending: false });
  const cards: BoardCard[] = (data ?? []).map((a) => {
    const p = checklistProgress(a.checklist as ChecklistItem[]);
    return { id: a.id, title: a.title, type: a.type, provider: a.provider, status: a.status as AppStatus,
      amount_requested: a.amount_requested, amount_approved: a.amount_approved, due_date: a.due_date, done: p.done, total: p.total };
  });
  const approved = cards.filter((c) => c.status === "approved").reduce((s, c) => s + Number(c.amount_approved ?? c.amount_requested ?? 0), 0);
  const pending = cards.filter((c) => !["approved", "declined"].includes(c.status)).reduce((s, c) => s + Number(c.amount_requested ?? 0), 0);

  return (
    <section className="container flex flex-col gap-6 py-10">
      {head}
      {sp.error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{sp.error}</p>}
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="card"><dt className="text-xs font-semibold uppercase tracking-wider text-subtle">In progress</dt><dd className="num text-2xl font-bold text-ink">{cards.filter((c) => !["approved", "declined"].includes(c.status)).length}</dd></div>
        <div className="card"><dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Requested (open)</dt><dd className="num text-2xl font-bold text-ink">{money(pending)}</dd></div>
        <div className="card"><dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Approved</dt><dd className="num text-2xl font-bold text-brand-text">{money(approved)}</dd></div>
      </dl>
      {cards.length ? <ApplicationBoard cards={cards} /> : (
        <p className="card text-subtle">No applications yet. Start one from a <Link href="/app/grants" className="underline">matched program</Link> or add your own below.</p>
      )}

      <form id="new" action={createApplication} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <h2 className="text-lg font-bold sm:col-span-2 lg:col-span-3">Add an application</h2>
        <label className="field">Type<select name="type" className="input" defaultValue="grant">{APP_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
        <label className="field">Name<input name="title" required minLength={2} maxLength={200} className="input" placeholder="e.g., BDC term loan" /></label>
        <label className="field">Funder / lender / investor<input name="provider" maxLength={200} className="input" /></label>
        <label className="field">Investor type<select name="funding_source" className="input" defaultValue="angel"><option value="angel">Angel</option><option value="venture_capital">Venture capital</option><option value="private_equity">Private equity</option></select><span className="help">Only used for investor rounds.</span></label>
        <label className="field">Amount requested (CAD)<input name="amount_requested" type="number" min={0} step={1000} className="input num" /></label>
        <label className="field">Due date<input name="due_date" type="date" className="input" /></label>
        <div className="sm:col-span-2 lg:col-span-3"><button className="btn-primary">Create application</button></div>
      </form>
    </section>
  );
}

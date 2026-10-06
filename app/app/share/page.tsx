import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyBusiness, requireUser } from "@/lib/auth";
import { InvestorSnapshot, type SnapshotData } from "@/components/snapshot";
import { PrintButton } from "@/components/print-button";
import { snapshotSummary } from "@/lib/snapshot-summary";
import { confirmContact } from "./actions";

export const metadata = { title: "Investor snapshot" };

const VISIBILITY: Record<string, string> = { private: "Private", link: "Shared by link", partners: "Shared with Funding Lab partners" };

export default async function SnapshotPage({ searchParams }: { searchParams: Promise<{ error?: string; edit?: string }> }) {
  const { profile } = await requireUser("/app/share");
  const b = await getMyBusiness();
  if (!b) redirect("/app/profile?step=1");
  const sp = await searchParams;

  // Ask for contact details before showing the summary report.
  if (!b.contact_name || !b.contact_email || !b.contact_phone || sp.edit) {
    return (
      <section className="container flex justify-center py-10 md:py-16">
        <form action={confirmContact} className="card flex w-full max-w-md flex-col gap-4">
          <div>
            <span className="eyebrow">Your summary report is ready</span>
            <h1 className="mt-1 text-2xl font-bold">Where should we reach you?</h1>
            <p className="mt-1 text-sm text-subtle">Confirm your contact details to view your investor snapshot and summary. The Funding Lab Team uses them to follow up on introductions; they&apos;re never shown to partners without your consent.</p>
          </div>
          {sp.error && <p className="error rounded-md bg-danger-soft px-3 py-2" role="alert">{sp.error}</p>}
          <label className="field">Your name<input name="contact_name" required defaultValue={b.contact_name ?? profile.full_name ?? ""} autoComplete="name" className="input" /></label>
          <label className="field">Email<input name="contact_email" type="email" required defaultValue={b.contact_email ?? profile.email ?? ""} autoComplete="email" className="input" /></label>
          <label className="field">Contact number<input name="contact_phone" type="tel" required defaultValue={b.contact_phone ?? ""} autoComplete="tel" placeholder="e.g. 604-555-0100" className="input" /></label>
          <button className="btn-cta">Show my summary</button>
        </form>
      </section>
    );
  }

  const supabase = await createClient();
  const [{ data: history }, { data: docs }] = await Promise.all([
    supabase.from("funding_history").select("source, amount, year, program_name, department, loan_subtype").eq("business_id", b.id).order("year", { ascending: false }),
    supabase.from("documents").select("kind").eq("business_id", b.id),
  ]);
  const snapshot: SnapshotData = { ...b, funding_history: history ?? [], documents: [...new Set((docs ?? []).map((d) => d.kind as string))] };

  return (
    <section className="container flex flex-col gap-5 py-8 md:py-10">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Investor snapshot</span>
          <p className="text-sm text-subtle">Contact: {b.contact_name} · {b.contact_email} · {b.contact_phone} · <a href="/app/share?edit=1" className="underline">Edit</a></p>
        </div>
        <span className="pill">{VISIBILITY[b.visibility] ?? b.visibility}</span>
      </div>
      <p className="no-print rounded-lg bg-info-soft px-3.5 py-2.5 text-sm text-info">
        Sharing your snapshot with investors and partners is managed by the Funding Lab Team, so every share is tracked and introduced properly. Want it shared? Ask us from the Contact page or your introductions.
      </p>
      <InvestorSnapshot s={snapshot} summary={snapshotSummary(snapshot)} />
      <div className="no-print flex justify-center"><PrintButton /></div>
    </section>
  );
}

import { createClient } from "@/lib/supabase/server";
import { getMyBusiness, requireUser } from "@/lib/auth";
import { readiness } from "@/lib/readiness";
import { money } from "@/lib/format";
import type { DocumentRow, FundingHistoryRow } from "@/lib/types";
import { StepBasics, StepConsent, StepHistory, StepNeed, StepStage, WizardShell } from "@/components/profile/wizard";
import { deleteDocument, uploadDocument } from "./actions";

export const metadata = { title: "Business profile" };

const DOC_KINDS = [
  { kind: "pitch_deck", label: "Pitch deck", hint: "PDF or PowerPoint" },
  { kind: "financials", label: "Financial statements", hint: "Last 2 years + YTD" },
  { kind: "business_plan", label: "Business plan", hint: "PDF or Word" },
] as const;

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ step?: string; error?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireUser("/profile");
  const business = await getMyBusiness();
  const maxStep = business ? Math.min(5, business.profile_step) : 1;
  const requested = Number(sp.step ?? maxStep) || 1;
  const step = business ? Math.min(Math.max(1, requested), 5) : 1;

  let history: FundingHistoryRow[] = [];
  let documents: DocumentRow[] = [];
  if (business) {
    const supabase = await createClient();
    const [h, d] = await Promise.all([
      supabase.from("funding_history").select("*").eq("business_id", business.id).order("year", { ascending: false }),
      supabase.from("documents").select("*").eq("business_id", business.id).order("created_at"),
    ]);
    history = (h.data ?? []) as FundingHistoryRow[];
    documents = (d.data ?? []) as DocumentRow[];
  }
  const r = business
    ? readiness({
        stage: business.stage, years_in_business: business.years_in_business, annual_revenue: business.annual_revenue,
        documents: documents.map((d) => d.kind), funding_history_count: history.length,
        has_basics: !!(business.industry && business.amount_sought && business.use_of_funds.length),
      })
    : { total: 0 };
  const raised = history.reduce((s, h) => s + Number(h.amount), 0);

  return (
    <section className="container grid items-start gap-6 py-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <WizardShell step={step}>
        {profile.role === "partner" && (
          <p className="pill-warning self-start px-3 py-1.5 text-sm">You are signed in as a partner. Business profiles are for companies seeking funding.</p>
        )}
        {step === 1 && <StepBasics business={business} />}
        {step === 2 && business && <StepStage business={business} />}
        {step === 3 && business && <StepNeed business={business} />}
        {step === 4 && business && <StepHistory history={history} />}
        {step === 5 && business && (
          <>
            <div className="card flex flex-col gap-3">
              <h2 className="text-lg font-bold">Documents (optional)</h2>
              {sp.error && <p className="error" role="alert">{sp.error}</p>}
              <div className="grid gap-3 md:grid-cols-3">
                {DOC_KINDS.map((k) => {
                  const files = documents.filter((d) => d.kind === k.kind);
                  return (
                    <div key={k.kind} className="flex flex-col gap-2 rounded-lg border border-line p-3">
                      <div className="flex items-center justify-between"><b className="text-ink">{k.label}</b>
                        <span className={files.length ? "pill-success" : "pill"}>{files.length ? "Uploaded" : "Optional"}</span></div>
                      <span className="help">{k.hint}</span>
                      {files.map((f) => (
                        <form key={f.id} action={deleteDocument} className="flex items-center justify-between gap-2 text-[13px]">
                          <input type="hidden" name="id" value={f.id} />
                          <span className="truncate">{f.file_name}</span>
                          <button className="btn-ghost btn-sm">Remove</button>
                        </form>
                      ))}
                      <form action={uploadDocument} className="flex flex-col gap-2">
                        <input type="hidden" name="kind" value={k.kind} />
                        <input type="file" name="file" required className="text-[13px]"
                          accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv" />
                        <button className="btn-secondary btn-sm self-start">Upload</button>
                      </form>
                    </div>
                  );
                })}
              </div>
              <p className="help">Files are encrypted at rest and visible only to you, Funding Lab admins, and partners you approve.</p>
            </div>
            <StepConsent business={business} documents={documents} />
          </>
        )}
      </WizardShell>
      <aside className="flex flex-col gap-3 lg:sticky lg:top-24">
        <div className="card flex flex-col gap-2">
          <span className="eyebrow text-subtle">Live summary</span>
          <div className="flex justify-between"><span>Readiness</span><b className="num text-ink">{r.total}/100</b></div>
          <div className="h-1.5 overflow-hidden rounded bg-muted"><i className="block h-full bg-teal" style={{ width: `${r.total}%` }} /></div>
          <div className="flex justify-between"><span>Raised to date</span><b className="num text-ink">{money(raised)}</b></div>
          <div className="flex justify-between"><span>Federal grants found</span><b className="num text-ink">{history.filter((h) => h.auto_found).length}</b></div>
        </div>
        <p className="rounded-lg bg-info-soft px-3.5 py-2.5 text-sm text-info">Your profile is private by default. Nothing is shared with partners without your consent.</p>
      </aside>
    </section>
  );
}

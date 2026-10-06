"use client";

import { useActionState, useCallback, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  CONSENT, PROFILE_STEP_COUNT, FUNDING_SOURCES, FUNDING_STATUSES, INDUSTRIES, LEGAL_STRUCTURES, LOAN_SUBTYPES, OWNERSHIP_TAGS, PROVINCES, REVENUE_BANDS, STAGES, USES_OF_FUNDS,
} from "@/lib/constants";
import { money } from "@/lib/format";
import type { Business, DocumentRow, FundingHistoryRow } from "@/lib/types";
import { saveBasics, saveConsent, saveHistory, saveNeed, saveStage, saveTraction, type StepState } from "@/app/app/profile/actions";
import { GrantLookupField } from "./grant-lookup";

const STEP_COUNT = PROFILE_STEP_COUNT;
const STEP_NAMES = ["Basics", "Stage", "Funding need", "History", "Traction", "Documents"];
const TITLES = [
  "Tell us about your business", "Where are you today?", "How much, and for what?", "What have you raised so far?",
  "Show your traction", "Documents and consent",
];

export function WizardShell({ step, maxStep, children }: { step: number; maxStep: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="eyebrow">Business profile · step {step} of {STEP_COUNT}</span>
        <h1 className="mt-2 text-3xl font-bold">{TITLES[step - 1]}</h1>
      </div>
      <ol className="grid grid-cols-6 gap-1.5" aria-label="Progress">
        {STEP_NAMES.map((n, i) => {
          const reachable = i + 1 <= maxStep;
          const inner = (
            <>
              <i className={`h-1.5 rounded ${i + 1 <= step ? "bg-brand" : "bg-line"}`} />
              <span className="hidden sm:inline">{n}</span>
            </>
          );
          return (
            <li key={n} className={`flex flex-col gap-1.5 text-xs ${i + 1 === step ? "font-semibold text-ink" : "text-subtle"}`}>
              {reachable ? (
                <Link href={`/app/profile?step=${i + 1}`} className="flex flex-col gap-1.5" aria-current={i + 1 === step ? "step" : undefined}>{inner}</Link>
              ) : <span className="flex flex-col gap-1.5">{inner}</span>}
            </li>
          );
        })}
      </ol>
      {children}
    </div>
  );
}

function Footer({ step }: { step: number }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
      {step > 1 ? <Link href={`/app/profile?step=${step - 1}`} className="btn-secondary">Back</Link> : <span />}
      <span className="help">Saved when you continue. Resume anytime.</span>
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : step === STEP_COUNT ? "Finish and view dashboard" : "Save and continue"}</button>
    </div>
  );
}

function FormError({ state }: { state: StepState }) {
  if (!state?.error) return null;
  return <p className="error rounded-md bg-danger-soft px-3 py-2" role="alert">{state.error}</p>;
}
const fe = (state: StepState, key: string) => (state?.fieldErrors?.[key] ? <span className="error">{state.fieldErrors[key]}</span> : null);

// ---------------------------------------------------------------- Step 1 · Basics
export function StepBasics({ business }: { business: Business | null }) {
  const [state, action] = useActionState(saveBasics, undefined);
  const b = business;
  const [industry, setIndustry] = useState(b?.industry ?? "");
  const getPlace = useCallback(() => {
    const v = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value || null;
    return { province: v("province"), city: v("city"), businessNumber: v("business_number") };
  }, []);
  return (
    <form action={action} className="card flex flex-col gap-4" noValidate>
      <FormError state={state} />
      <GrantLookupField defaultName={b?.name ?? ""} getPlace={getPlace} />
      {fe(state, "name")}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">Legal structure
          <select name="legal_structure" defaultValue={b?.legal_structure ?? ""} className="input">
            <option value="">Select…</option>
            {LEGAL_STRUCTURES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>{fe(state, "legal_structure")}
        </label>
        <label className="field">Province of incorporation
          <select name="incorporation_province" defaultValue={b?.incorporation_province ?? ""} className="input">
            <option value="">Not incorporated / federal</option>
            {PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="field">Province (operations)
          <select id="province" name="province" defaultValue={b?.province ?? "BC"} className="input">
            {PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="field">City<input id="city" name="city" defaultValue={b?.city ?? ""} autoComplete="address-level2" className="input" />{fe(state, "city")}</label>
        <label className="field">Industry / sector
          <select name="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} className="input">
            <option value="">Select…</option>
            {INDUSTRIES.map((i) => <option key={i.id} value={i.id}>{i.id === "other" ? "Other (please specify)" : i.label}</option>)}
          </select>{fe(state, "industry")}
        </label>
        {industry === "other" && (
          <label className="field">Your industry<input name="industry_other" defaultValue={b?.industry_other ?? ""} maxLength={120} placeholder="e.g. Aquaculture" className="input" />{fe(state, "industry_other")}</label>
        )}
        <label className="field">NAICS code (optional)<input name="naics_code" defaultValue={b?.naics_code ?? ""} inputMode="numeric" className="input" />
          <span className="help">2–6 digits. Helps match industry-specific programs.</span>{fe(state, "naics_code")}</label>
        <label className="field">Website<input name="website" defaultValue={b?.website ?? ""} placeholder="yourcompany.ca" className="input" /></label>
        <label className="field">Years in business<input name="years_in_business" type="number" min={0} step="0.5" defaultValue={b?.years_in_business ?? ""} className="input" /></label>
        <label className="field">Employees<input name="employees" type="number" min={0} defaultValue={b?.employees ?? ""} className="input" /></label>
        <label className="field">Annual revenue
          <select name="revenue_band" defaultValue={b?.revenue_band ?? ""} className="input">
            <option value="">Select…</option>
            {REVENUE_BANDS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </label>
        <label className="field">CRA business number (optional)
          <input id="business_number" name="business_number" defaultValue={b?.business_number ?? ""} inputMode="numeric" className="input" />
          <span className="help">Improves grant matching. First 9 digits are enough.</span>{fe(state, "business_number")}
        </label>
        <label className="field sm:col-span-2">Describe your business in a paragraph
          <textarea name="description" rows={3} maxLength={1200} defaultValue={b?.description ?? ""} className="input" placeholder="What you sell, to whom, and what makes you different." />
          <span className="help">Partners see the first sentence (without your name) before an introduction.</span>{fe(state, "description")}
        </label>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Ownership (optional)</legend>
        <p className="help">Some programs are reserved for specific owners. We use this only to find programs you&apos;re eligible for; it&apos;s never shown to partners.</p>
        <div className="flex flex-wrap gap-2">
          {OWNERSHIP_TAGS.map((t) => (
            <label key={t.id} className="pill cursor-pointer"><input type="checkbox" name="ownership_tags" value={t.id} defaultChecked={b?.ownership_tags?.includes(t.id)} /> {t.label}</label>
          ))}
        </div>
      </fieldset>
      <Footer step={1} />
    </form>
  );
}

// ---------------------------------------------------------------- Step 2 · Stage
export function StepStage({ business }: { business: Business }) {
  const [state, action] = useActionState(saveStage, undefined);
  return (
    <form action={action} className="card flex flex-col gap-3">
      <FormError state={state} />
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Business stage</legend>
        {STAGES.map((s) => (
          <label key={s.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3.5 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
            <input type="radio" name="stage" value={s.id} defaultChecked={business.stage === s.id} className="mt-1.5" />
            <span><b className="block text-ink">{s.name}</b><span className="text-sm text-subtle">{s.desc}</span></span>
          </label>
        ))}
      </fieldset>
      <Footer step={2} />
    </form>
  );
}

// ---------------------------------------------------------------- Step 3 · Need
export function StepNeed({ business }: { business: Business }) {
  const [state, action] = useActionState(saveNeed, undefined);
  const [uses, setUses] = useState<string[]>(business.use_of_funds ?? []);
  return (
    <form action={action} className="card flex flex-col gap-4">
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="field">Amount sought (CAD)
          <input name="amount_sought" type="number" min={0} step={1000} defaultValue={business.amount_sought ?? ""} className="input" />
          {fe(state, "amount_sought")}
        </label>
        <label className="field">Timeline
          <select name="timeline" defaultValue={business.timeline ?? "3–6 months"} className="input">
            {["Under 3 months", "3–6 months", "6–12 months", "12+ months"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="field">Funding preference
          <select name="funding_preference" defaultValue={business.funding_preference ?? "either"} className="input">
            <option value="non_dilutive">Non-dilutive (grants, loans)</option>
            <option value="dilutive">Equity (investors)</option>
            <option value="either">Open to either</option>
          </select>
        </label>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-ink">Use of funds</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {USES_OF_FUNDS.map((u) => (
            <label key={u.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
              <input type="checkbox" name="use_of_funds" value={u.id} checked={uses.includes(u.id)}
                onChange={(e) => setUses((prev) => (e.target.checked ? [...prev, u.id] : prev.filter((x) => x !== u.id)))} />
              <b className="text-ink">{u.label}</b>
            </label>
          ))}
        </div>
        {fe(state, "use_of_funds")}
      </fieldset>
      {uses.includes("hire_staff") && (
        <label className="field">Roles to hire<input name="hire_roles" defaultValue={business.hire_roles ?? ""} placeholder="e.g. 2 engineers, 1 sales lead" className="input" />{fe(state, "hire_roles")}</label>
      )}
      {uses.includes("other") && (
        <label className="field">Other use of funds<input name="use_of_funds_other" defaultValue={business.use_of_funds_other ?? ""} className="input" />{fe(state, "use_of_funds_other")}</label>
      )}
      <Footer step={3} />
    </form>
  );
}

// ---------------------------------------------------------------- Step 4 · History
type Row = { source: string; loan_subtype: string | null; amount: string; year: string; status: string; provider_name: string };

export function StepHistory({ history }: { history: FundingHistoryRow[] }) {
  const [state, action] = useActionState(saveHistory, undefined);
  const grants = history.filter((h) => h.auto_found);
  const [rows, setRows] = useState<Row[]>(
    history.filter((h) => !h.auto_found).map((h) => ({
      source: h.source, loan_subtype: h.loan_subtype, amount: String(h.amount), year: h.year ? String(h.year) : "",
      status: h.status ?? "received", provider_name: h.provider_name ?? "",
    })),
  );
  const total = useMemo(
    () => grants.reduce((s, g) => s + Number(g.amount), 0) + rows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [grants, rows],
  );
  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const serialized = JSON.stringify(rows.map((r) => ({ ...r, amount: Number(r.amount) || 0, year: r.year ? Number(r.year) : null })));

  return (
    <form action={action} className="card flex flex-col gap-4">
      <FormError state={state} />
      {grants.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-brand">
          <div className="flex items-center justify-between bg-brand-soft px-4 py-2.5"><b className="text-brand-text">Federal grants found</b><span className="pill-info">Verified from open data</span></div>
          {grants.map((g) => (
            <div key={g.id} className="flex justify-between gap-3 border-t border-line px-4 py-2.5">
              <span><b className="text-ink">{g.program_name}</b><span className="block text-[13px] text-subtle">{g.department} · {g.year}</span></span>
              <span className="num font-medium text-ink">{money(g.amount)}</span>
            </div>
          ))}
          <p className="border-t border-line px-4 py-2 text-[13px] text-subtle">Source: Government of Canada Open Data (federal only).</p>
        </div>
      )}
      <input type="hidden" name="history" value={serialized} />
      <div className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <div key={i} className="grid items-end gap-2 rounded-lg border border-line p-3 sm:grid-cols-6">
            <label className="field sm:col-span-2">Source
              <select value={r.source} onChange={(e) => update(i, { source: e.target.value })} className="input">
                {FUNDING_SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            {r.source === "business_loan" ? (
              <label className="field sm:col-span-2">Loan type
                <select value={r.loan_subtype ?? "bank_other"} onChange={(e) => update(i, { loan_subtype: e.target.value })} className="input">
                  {LOAN_SUBTYPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
            ) : <span className="hidden sm:col-span-2 sm:block" />}
            <label className="field sm:col-span-2">Provider (optional)<input value={r.provider_name} onChange={(e) => update(i, { provider_name: e.target.value })} className="input" placeholder="e.g. BDC, Vancity, angel group" /></label>
            <label className="field sm:col-span-2">Amount (CAD)<input type="number" min={0} value={r.amount} onChange={(e) => update(i, { amount: e.target.value })} className="input" /></label>
            <label className="field">Year<input type="number" min={1950} max={2100} value={r.year} onChange={(e) => update(i, { year: e.target.value })} className="input" /></label>
            <label className="field">Status
              <select value={r.status} onChange={(e) => update(i, { status: e.target.value })} className="input">
                {FUNDING_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <button type="button" className="btn-ghost btn-sm sm:col-span-2 sm:justify-self-end" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn-secondary btn-sm"
          onClick={() => setRows((rs) => [...rs, { source: "angel", loan_subtype: null, amount: "", year: String(new Date().getFullYear()), status: "received", provider_name: "" }])}>
          + Add funding
        </button>
        <span className="text-sm text-subtle">Total raised to date <b className="num ml-2 text-lg text-ink">{money(total)}</b></span>
      </div>
      <p className="help">No funding yet? That&apos;s fine. Continue to the next step.</p>
      <Footer step={4} />
    </form>
  );
}

// ---------------------------------------------------------------- Step 5 · Traction
type Pair = { a: string; b: string };
function PairList({ title, items, setItems, la, lb, max }: { title: string; items: Pair[]; setItems: (f: (p: Pair[]) => Pair[]) => void; la: string; lb: string; max: number }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold text-ink">{title}</legend>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <label className="field">{la}<input value={it.a} maxLength={80} onChange={(e) => setItems((p) => p.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} className="input" /></label>
          <label className="field">{lb}<input value={it.b} maxLength={80} onChange={(e) => setItems((p) => p.map((x, j) => (j === i ? { ...x, b: e.target.value } : x)))} className="input" /></label>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setItems((p) => p.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      {items.length < max && <button type="button" className="btn-secondary btn-sm self-start" onClick={() => setItems((p) => [...p, { a: "", b: "" }])}>+ Add</button>}
    </fieldset>
  );
}

export function StepTraction({ business }: { business: Business }) {
  const [state, action] = useActionState(saveTraction, undefined);
  const [metrics, setMetrics] = useState<Pair[]>((business.key_metrics ?? []).map((m) => ({ a: m.label, b: m.value })));
  const [team, setTeam] = useState<Pair[]>((business.team ?? []).map((m) => ({ a: m.name, b: m.role })));
  const clean = (p: Pair[], ka: string, kb: string) => JSON.stringify(p.filter((x) => x.a.trim() && x.b.trim()).map((x) => ({ [ka]: x.a, [kb]: x.b })));
  return (
    <form action={action} className="card flex flex-col gap-4">
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="field">Revenue, last 12 months (CAD)<input name="revenue_12m" type="number" min={0} defaultValue={business.revenue_12m ?? ""} className="input" />{fe(state, "revenue_12m")}</label>
        <label className="field">Growth rate (% year over year)<input name="growth_rate_pct" type="number" step="0.1" defaultValue={business.growth_rate_pct ?? ""} className="input" />{fe(state, "growth_rate_pct")}</label>
        <label className="field">Paying customers<input name="customers" type="number" min={0} defaultValue={business.customers ?? ""} className="input" />{fe(state, "customers")}</label>
      </div>
      <input type="hidden" name="key_metrics" value={clean(metrics, "label", "value")} />
      <input type="hidden" name="team" value={clean(team, "name", "role")} />
      <PairList title="Key metrics (optional)" items={metrics} setItems={setMetrics} la="Metric" lb="Value" max={8} />
      <PairList title="Leadership team (optional)" items={team} setItems={setTeam} la="Name" lb="Role" max={12} />
      <p className="help">Pre-revenue? Leave the numbers blank and add milestones as key metrics (e.g. &ldquo;Pilot customers: 3&rdquo;).</p>
      <Footer step={5} />
    </form>
  );
}

// ---------------------------------------------------------------- Step 6 · Consent (documents are separate forms above)
export function StepConsent({ business, documents }: { business: Business; documents: DocumentRow[] }) {
  const [state, action] = useActionState(saveConsent, undefined);
  const kinds = new Set(documents.map((d) => d.kind));
  const missing = !kinds.has("business_plan") || !kinds.has("pitch_deck");
  return (
    <form action={action} className="card flex flex-col gap-4">
      <FormError state={state} />
      {missing && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-soft p-4">
          <span><b className="text-ink">Need a Business Plan or Pitch Deck? We can build it.</b><span className="block text-sm text-subtle">Fixed-scope, delivered by the Funding Lab Team and vetted partners.</span></span>
          <Link href="/services/business_plan" className="btn-secondary btn-sm">See services</Link>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <label className="flex items-start gap-3"><input type="checkbox" name="consent_matching" defaultChecked={business.consent_matching} className="mt-1" />{CONSENT.matching}</label>
        <label className="flex items-start gap-3"><input type="checkbox" name="consent_sharing" defaultChecked={business.consent_sharing} className="mt-1" />{CONSENT.sharing}</label>
        <p className="help">You can withdraw consent at any time in Settings. Without matching consent, Funding Lab can&apos;t introduce you to partners.</p>
      </div>
      <Footer step={6} />
    </form>
  );
}

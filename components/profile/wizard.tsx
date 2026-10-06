"use client";

import { useActionState, useCallback, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  CONSENT, FUNDING_SOURCES, INDUSTRIES, LOAN_SUBTYPES, PROVINCES, STAGES, USES_OF_FUNDS,
} from "@/lib/constants";
import { money } from "@/lib/format";
import type { Business, DocumentRow, FundingHistoryRow } from "@/lib/types";
import { saveBasics, saveConsent, saveHistory, saveNeed, saveStage, type StepState } from "@/app/profile/actions";
import { GrantLookupField } from "./grant-lookup";

const STEP_NAMES = ["Basics", "Stage", "Funding need", "History", "Documents"];
const TITLES = ["Tell us about your business", "Where are you today?", "How much, and for what?", "What have you raised so far?", "Documents and consent"];

export function WizardShell({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="eyebrow">Business profile · step {step} of 5</span>
        <h1 className="mt-2 text-3xl font-bold">{TITLES[step - 1]}</h1>
      </div>
      <ol className="grid grid-cols-5 gap-1.5" aria-label="Progress">
        {STEP_NAMES.map((n, i) => (
          <li key={n} className={`flex flex-col gap-1.5 text-xs ${i + 1 === step ? "font-semibold text-ink" : "text-subtle"}`}>
            <Link href={`/profile?step=${i + 1}`} className="flex flex-col gap-1.5" aria-current={i + 1 === step ? "step" : undefined}>
              <i className={`h-1.5 rounded ${i + 1 <= step ? "bg-teal" : "bg-line"}`} />
              <span className="hidden sm:inline">{n}</span>
            </Link>
          </li>
        ))}
      </ol>
      {children}
    </div>
  );
}

function Footer({ step }: { step: number }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
      {step > 1 ? <Link href={`/profile?step=${step - 1}`} className="btn-secondary">Back</Link> : <span />}
      <span className="help">Saved when you continue. Resume anytime.</span>
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : step === 5 ? "Finish and view dashboard" : "Continue"}</button>
    </div>
  );
}

function FormError({ state }: { state: StepState }) {
  if (!state?.error) return null;
  return <p className="error rounded-md bg-danger-soft px-3 py-2" role="alert">{state.error}</p>;
}
const fe = (state: StepState, key: string) =>
  state?.fieldErrors?.[key] ? <span className="error">{state.fieldErrors[key]}</span> : null;

// ---------------------------------------------------------------- Step 1
export function StepBasics({ business }: { business: Business | null }) {
  const [state, action] = useActionState(saveBasics, undefined);
  const b = business;
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
        <label className="field">Province
          <select id="province" name="province" defaultValue={b?.province ?? "BC"} className="input">
            {PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="field">City<input id="city" name="city" defaultValue={b?.city ?? ""} className="input" />{fe(state, "city")}</label>
        <label className="field">Industry / sector
          <select name="industry" defaultValue={b?.industry ?? ""} className="input">
            <option value="">Select…</option>
            {INDUSTRIES.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
          </select>{fe(state, "industry")}
        </label>
        <label className="field">Website<input name="website" defaultValue={b?.website ?? ""} placeholder="yourcompany.ca" className="input" /></label>
        <label className="field">Years in business<input name="years_in_business" type="number" min={0} step="0.5" defaultValue={b?.years_in_business ?? ""} className="input" /></label>
        <label className="field">Annual revenue (CAD, optional)<input name="annual_revenue" type="number" min={0} defaultValue={b?.annual_revenue ?? ""} className="input" /></label>
        <label className="field">CRA business number (optional)
          <input id="business_number" name="business_number" defaultValue={b?.business_number ?? ""} inputMode="numeric" className="input" />
          <span className="help">Improves grant matching. First 9 digits are enough.</span>{fe(state, "business_number")}
        </label>
        <label className="field">Contact name<input name="contact_name" defaultValue={b?.contact_name ?? ""} autoComplete="name" className="input" />{fe(state, "contact_name")}</label>
        <label className="field">Email<input name="contact_email" type="email" defaultValue={b?.contact_email ?? ""} autoComplete="email" className="input" />{fe(state, "contact_email")}</label>
        <label className="field">Phone<input name="contact_phone" type="tel" defaultValue={b?.contact_phone ?? ""} autoComplete="tel" className="input" /></label>
      </div>
      <Footer step={1} />
    </form>
  );
}

// ---------------------------------------------------------------- Step 2
export function StepStage({ business }: { business: Business }) {
  const [state, action] = useActionState(saveStage, undefined);
  return (
    <form action={action} className="card flex flex-col gap-3">
      <FormError state={state} />
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Business stage</legend>
        {STAGES.map((s) => (
          <label key={s.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3.5 has-[:checked]:border-teal has-[:checked]:bg-teal-soft">
            <input type="radio" name="stage" value={s.id} defaultChecked={business.stage === s.id} className="mt-1.5" />
            <span><b className="block text-ink">{s.name}</b><span className="text-sm text-subtle">{s.desc}</span></span>
          </label>
        ))}
      </fieldset>
      <Footer step={2} />
    </form>
  );
}

// ---------------------------------------------------------------- Step 3
export function StepNeed({ business }: { business: Business }) {
  const [state, action] = useActionState(saveNeed, undefined);
  const [uses, setUses] = useState<string[]>(business.use_of_funds ?? []);
  return (
    <form action={action} className="card flex flex-col gap-4">
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">Amount sought (CAD)
          <input name="amount_sought" type="number" min={0} step={1000} defaultValue={business.amount_sought ?? ""} className="input" />
          {fe(state, "amount_sought")}
        </label>
        <label className="field">Timeline
          <select name="timeline" defaultValue={business.timeline ?? "3–6 months"} className="input">
            {["Under 3 months", "3–6 months", "6–12 months", "12+ months"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-ink">Use of funds</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {USES_OF_FUNDS.map((u) => (
            <label key={u.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 has-[:checked]:border-teal has-[:checked]:bg-teal-soft">
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

// ---------------------------------------------------------------- Step 4
type Row = { source: string; loan_subtype: string | null; amount: string; year: string };

export function StepHistory({ history }: { history: FundingHistoryRow[] }) {
  const [state, action] = useActionState(saveHistory, undefined);
  const grants = history.filter((h) => h.auto_found);
  const [rows, setRows] = useState<Row[]>(
    history.filter((h) => !h.auto_found).map((h) => ({
      source: h.source, loan_subtype: h.loan_subtype, amount: String(h.amount), year: h.year ? String(h.year) : "",
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
        <div className="overflow-hidden rounded-lg border border-teal">
          <div className="flex items-center justify-between bg-teal-soft px-4 py-2.5"><b className="text-teal-text">Federal grants found</b><span className="pill-info">Auto-filled</span></div>
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
          <div key={i} className="grid items-end gap-2 sm:grid-cols-[1.3fr_1.3fr_1fr_90px_auto]">
            <label className="field">Source
              <select value={r.source} onChange={(e) => update(i, { source: e.target.value })} className="input">
                {FUNDING_SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label className={`field ${r.source === "business_loan" ? "" : "invisible"}`}>Loan type
              <select value={r.loan_subtype ?? "bank_other"} onChange={(e) => update(i, { loan_subtype: e.target.value })} className="input">
                {LOAN_SUBTYPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label className="field">Amount (CAD)<input type="number" min={0} value={r.amount} onChange={(e) => update(i, { amount: e.target.value })} className="input" /></label>
            <label className="field">Year<input type="number" min={1950} max={2100} value={r.year} onChange={(e) => update(i, { year: e.target.value })} className="input" /></label>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn-secondary btn-sm"
          onClick={() => setRows((rs) => [...rs, { source: "angel", loan_subtype: null, amount: "", year: String(new Date().getFullYear()) }])}>
          + Add funding
        </button>
        <span className="text-sm text-subtle">Total raised to date <b className="num ml-2 text-lg text-ink">{money(total)}</b></span>
      </div>
      <Footer step={4} />
    </form>
  );
}

// ---------------------------------------------------------------- Step 5
export function StepConsent({ business, documents }: { business: Business; documents: DocumentRow[] }) {
  const [state, action] = useActionState(saveConsent, undefined);
  const kinds = new Set(documents.map((d) => d.kind));
  const missing = !kinds.has("business_plan") || !kinds.has("pitch_deck");
  return (
    <form action={action} className="card flex flex-col gap-4">
      <FormError state={state} />
      {missing && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-teal-soft p-4">
          <span><b className="text-ink">Need a Business Plan or Data Room? We can build it.</b><span className="block text-sm text-subtle">Fixed-scope, delivered by vetted Funding Lab experts.</span></span>
          <Link href="/services#business_plan" className="btn-secondary btn-sm">See services</Link>
        </div>
      )}
      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <label className="flex items-start gap-3"><input type="checkbox" name="consent_matching" defaultChecked={business.consent_matching} className="mt-1" />{CONSENT.matching}</label>
        <label className="flex items-start gap-3"><input type="checkbox" name="consent_sharing" defaultChecked={business.consent_sharing} className="mt-1" />{CONSENT.sharing}</label>
        <p className="help">You can withdraw consent at any time. Without matching consent, Funding Lab can&apos;t introduce you to partners.</p>
      </div>
      <Footer step={5} />
    </form>
  );
}

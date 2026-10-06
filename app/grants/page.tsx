import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getFeaturedPrograms } from "@/lib/programs/queries";
import type { ProgramRow } from "@/lib/programs/types";
import { FeaturedGrantCard } from "@/components/grants/featured-card";
import { GrantTeaser } from "@/components/grants/grant-teaser";
import { IsedFinder } from "@/components/grants/ised-finder";
import { FitCallForm } from "@/components/grants/fit-call-form";
import { Turnstile } from "@/components/turnstile";
import { ClosingCta, PrimaryCta } from "@/components/cta";
import { INDUSTRIES, PROVINCES, STAGES } from "@/lib/constants";
import { money } from "@/lib/format";

export const metadata = {
  title: "Grants Hub — find the grants your business qualifies for",
  description: "Federal and B.C. grants explained in plain language. Search government programs, check your fit, and get help applying.",
};

const GRANTS_101: [string, string][] = [
  ["Grant vs. contribution vs. repayable vs. tax credit vs. wage subsidy",
    "A grant is money you don't repay, usually with light reporting. A contribution is also non-repayable but tied to an agreement with milestones and claims. Repayable (often interest-free) funding works like a loan with friendlier terms. A tax credit reduces tax or is refunded after you file (e.g. SR&ED). A wage subsidy pays part of a new hire's wages."],
  ["Cost share: why most grants pay 50–80%",
    "Programs share the cost with you. If a program covers 60%, you fund the other 40% from cash, loans or investment. Plan your share before you apply — applications short of the minimum contribution are often not assessed."],
  ["Reimbursement: most programs pay after you spend",
    "You usually spend first and claim back later. That creates a cash gap. Bridge financing from a lender can cover it."],
  ["Stacking: combining programs",
    "You can often combine programs, but most limit total government funding for the same costs (a stacking limit). Never claim the same cost twice."],
  ["Eligible vs. ineligible costs — and don't spend early",
    "Each program lists what it pays for. Spending before approval usually makes the cost ineligible, unless the program says otherwise."],
  ["Intake types: fixed deadline vs. continuous",
    "Some programs open for a fixed window (e.g. REDIP closes Nov 20). Others accept applications continuously or first come, first served until money runs out (e.g. RTRI)."],
  ["Reporting after you're funded",
    "Expect progress reports, expense claims with receipts, and job or outcome reporting. Missing them can delay or claw back payments."],
];

type SP = { q?: string; level?: string; province?: string; type?: string; stage?: string; industry?: string; open?: string; closing?: string };

export default async function GrantsHub({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const featured = await getFeaturedPrograms();
  let programs: ProgramRow[] = [];
  try {
    const supabase = await createClient();
    let q = supabase.from("programs").select("*").eq("active", true).order("is_featured", { ascending: false }).order("name").limit(60);
    if (sp.q) q = q.textSearch("name", sp.q, { type: "websearch", config: "english" });
    if (sp.level) q = q.eq("level", sp.level);
    if (sp.province) q = q.or(`province.eq.${sp.province},province.is.null`);
    if (sp.type) q = q.eq("type", sp.type);
    if (sp.stage) q = q.contains("stages", [sp.stage]);
    if (sp.industry) q = q.or(`industries.cs.{${sp.industry}},industries.eq.{}`);
    if (sp.open) q = q.or(`rolling.eq.true,intake_close.gt.${new Date().toISOString()}`);
    if (sp.closing) q = q.gt("intake_close", new Date().toISOString()).lt("intake_close", new Date(Date.now() + 45 * 864e5).toISOString());
    const { data } = await q;
    programs = (data ?? []) as ProgramRow[];
  } catch {
    programs = featured;
  }

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="container flex flex-col gap-5 py-12 md:py-16">
          <span className="eyebrow">Grants Hub</span>
          <h1 className="max-w-3xl text-4xl font-extrabold md:text-5xl">Find the grants your business qualifies for.</h1>
          <p className="max-w-[60ch] text-[17px] text-body">Federal and B.C. grants, explained in plain language. Check your fit in minutes, then let Funding Lab help you apply.</p>
          <div className="flex flex-wrap items-start gap-4">
            <PrimaryCta />
            <a href="#finder" className="btn-secondary px-6 py-3 text-base">Find My Grants</a>
          </div>
        </div>
      </section>

      <section className="container flex flex-col gap-5 py-12">
        <div><span className="eyebrow">Featured grants</span><h2 className="mt-1 text-3xl font-bold">Programs we&apos;re helping businesses apply to now</h2></div>
        <div className="grid gap-5 md:grid-cols-2">{featured.map((p) => <FeaturedGrantCard key={p.id} p={p} />)}</div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="container grid gap-8 py-12 lg:grid-cols-[.8fr_1.2fr]">
          <div><span className="eyebrow">Grants 101</span><h2 className="mt-1 text-3xl font-bold">How grants actually work</h2>
            <p className="mt-2 text-subtle">Seven things to know before you apply.</p></div>
          <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
            {GRANTS_101.map(([q, a]) => (
              <details key={q} className="group p-4">
                <summary className="cursor-pointer list-none font-semibold text-ink">{q}<span className="float-right text-subtle group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-body">{a}</p>
                {q.startsWith("Reimbursement") && <Link href="/funding-paths/business-loans" className="mt-1 inline-block text-sm font-semibold text-brand-text underline">Bridge financing →</Link>}
                {q.startsWith("Reporting") && <Link href="/services#grant_writing" className="mt-1 inline-block text-sm font-semibold text-brand-text underline">Get help with claims and reporting →</Link>}
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="finder" className="container scroll-mt-24 py-12"><IsedFinder /></section>

      <section className="border-y border-line bg-surface">
        <div className="container flex flex-col gap-5 py-12">
          <div><span className="eyebrow">Funding Lab program database</span><h2 className="mt-1 text-3xl font-bold">Search programs</h2></div>
          <form className="grid gap-3 md:grid-cols-4 lg:grid-cols-8" method="get">
            <label className="field md:col-span-2">Keyword<input name="q" defaultValue={sp.q} className="input" placeholder="e.g. export, hiring" /></label>
            <label className="field">Level<select name="level" defaultValue={sp.level ?? ""} className="input"><option value="">Any</option><option value="federal">Federal</option><option value="provincial">Provincial</option><option value="regional">Regional</option></select></label>
            <label className="field">Province<select name="province" defaultValue={sp.province ?? ""} className="input"><option value="">Any</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></label>
            <label className="field">Type<select name="type" defaultValue={sp.type ?? ""} className="input"><option value="">Any</option>{["grant", "contribution", "loan", "repayable", "tax_credit", "wage_subsidy", "equity"].map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</select></label>
            <label className="field">Stage<select name="stage" defaultValue={sp.stage ?? ""} className="input"><option value="">Any</option>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label className="field">Industry<select name="industry" defaultValue={sp.industry ?? ""} className="input"><option value="">Any</option>{INDUSTRIES.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}</select></label>
            <div className="flex flex-col justify-end gap-1 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="open" value="1" defaultChecked={!!sp.open} />Open now</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="closing" value="1" defaultChecked={!!sp.closing} />Closing soon</label>
            </div>
            <button className="btn-primary md:col-span-4 lg:col-span-8 lg:justify-self-start">Search</button>
          </form>
          <p className="text-sm text-subtle">{programs.length} program{programs.length === 1 ? "" : "s"}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {programs.map((p) => (
              <article key={p.id} className="card flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="pill">{p.level === "federal" ? "Federal" : p.level === "provincial" ? `Provincial${p.province ? ` · ${p.province}` : ""}` : p.level}</span>
                  <span className="pill">{p.type.replace("_", " ")}</span>
                  {p.is_featured && <span className="pill-success">Featured</span>}
                  {p.is_sample && <span className="pill-warning">Sample data — verify before launch</span>}
                </div>
                <h3 className="text-lg font-bold">{p.name}</h3>
                <p className="text-sm text-subtle">{p.funder}</p>
                <p className="text-sm">{p.summary}</p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1 text-[13px] text-subtle">
                  <span>{p.max_amount ? `Up to ${money(p.max_amount, true)}` : ""}{p.cost_share_pct ? ` · up to ${p.cost_share_pct}% of costs` : ""}</span>
                  <span>{p.last_verified_at ? `Last verified ${p.last_verified_at}` : "Not yet verified"}</span>
                </div>
                <div className="flex gap-2">
                  {p.is_featured ? <Link href={`/grants/${p.slug}`} className="btn-primary btn-sm">See if you qualify</Link> : null}
                  {p.official_url && <a href={p.official_url} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">Official page ↗</a>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container grid items-start gap-8 py-12 md:grid-cols-[.9fr_1.1fr]">
        <div><span className="eyebrow">Grant history check</span><h2 className="mt-1 text-3xl font-bold">Has your business received federal funding before?</h2></div>
        <div className="card"><GrantTeaser /></div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="container grid gap-8 py-12 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <span className="eyebrow">How Funding Lab helps</span>
            <h2 className="text-3xl font-bold">From fit call to funded</h2>
            <ol className="flex flex-col gap-2">
              {["Fit call", "Pick the right program", "Build the application", "Submit", "Claims & reporting"].map((s, i) => (
                <li key={s} className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-navy text-xs font-bold text-white">{i + 1}</span><span className="font-medium text-ink">{s}</span></li>
              ))}
            </ol>
            <p className="text-subtle">Services: <Link className="underline" href="/services#grant_writing">Grant Writing</Link> · <Link className="underline" href="/services#business_plan">Business Plan</Link> · <Link className="underline" href="/services#data_room">Data Room</Link></p>
            <Link href="/webinar" className="text-sm font-semibold text-brand-text underline">Join the Free Funding Webinar (Tuesdays 8 AM PT)</Link>
          </div>
          <div id="fit-call" className="card scroll-mt-24 flex flex-col gap-3">
            <h3 className="text-xl font-bold">Book a Free Grant Fit Call</h3>
            <FitCallForm sourcePage="grants" turnstile={<Turnstile />} />
          </div>
        </div>
      </section>

      <p className="container pt-6 text-sm text-subtle">Questions? <Link href="/contact" className="underline">Contact the Funding Lab Team</Link>.</p>
      <ClosingCta secondary={{ href: "/grants#fit-call", label: "Book a Free Grant Fit Call" }} />
    </>
  );
}

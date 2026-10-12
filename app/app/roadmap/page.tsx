import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/auth";
import { stageName } from "@/lib/constants";
import { money } from "@/lib/format";
import { generateRoadmap, suggestedStack, type StackItem } from "@/lib/roadmap";
import { StackBuilder } from "@/components/app/stack-builder";
import { toggleStep } from "./actions";

export const metadata = { title: "Funding roadmap" };

const WHEN = [
  { id: "now", label: "Now", note: "Start here" },
  { id: "next", label: "Next", note: "In the coming months" },
  { id: "later", label: "Later", note: "As you grow" },
] as const;

export default async function RoadmapPage() {
  const { business } = await requireBusinessContext("/app/roadmap");
  const supabase = await createClient();
  const [{ data: docs }, { count: assessments }, { data: roadmap }] = await Promise.all([
    supabase.from("documents").select("kind").eq("business_id", business.id),
    supabase.from("assessments").select("id", { count: "exact", head: true }).eq("business_id", business.id),
    supabase.from("roadmaps").select("done_steps, capital_stack, target_amount").eq("business_id", business.id).maybeSingle(),
  ]);
  const steps = generateRoadmap({
    stage: business.stage, funding_preference: business.funding_preference, use_of_funds: business.use_of_funds,
    amount_sought: business.amount_sought, documents: (docs ?? []).map((d) => d.kind as string),
    hasAssessment: (assessments ?? 0) > 0, consent_matching: business.consent_matching,
  });
  const done = new Set<string>((roadmap?.done_steps as string[] | undefined) ?? []);
  const target = Number(roadmap?.target_amount ?? business.amount_sought ?? 0);
  const saved = (roadmap?.capital_stack ?? {}) as { items?: StackItem[]; pre_money?: number | null };
  const items = saved.items?.length ? saved.items : suggestedStack(steps, target);
  const doneCount = steps.filter((s) => done.has(s.id)).length;

  return (
    <section className="container flex flex-col gap-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Funding roadmap</span>
          <h1 className="mt-1 text-3xl font-bold">Your path to {money(target, true)}</h1>
          <p className="max-w-measure text-subtle">
            Built from your stage ({stageName(business.stage)}), funding need and preference
            {business.funding_preference === "non_dilutive" ? " (non-dilutive only)" : business.funding_preference === "dilutive" ? " (equity first)" : ""}.
            It updates as your profile changes.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm text-subtle"><b className="num text-ink">{doneCount}</b> of {steps.length} steps done</span>
          <Link href="/app/profile?step=3" className="btn-secondary btn-sm">Edit funding need</Link>
        </div>
      </div>

      {!business.stage && (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">Set your business stage to get a tailored roadmap. <Link href="/app/profile?step=2" className="underline">Choose your stage</Link></p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {WHEN.map((w) => {
          const group = steps.filter((s) => s.when === w.id);
          return (
            <div key={w.id} className="flex flex-col gap-3">
              <h2 className="flex items-baseline gap-2 text-lg font-bold">{w.label}<span className="text-sm font-normal text-subtle">{w.note}</span></h2>
              {group.length === 0 && <p className="text-sm text-subtle">Nothing here yet.</p>}
              {group.map((s) => {
                const isDone = done.has(s.id);
                return (
                  <article key={s.id} className={`card flex flex-col gap-2 ${isDone ? "opacity-70" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <b className={`text-ink ${isDone ? "line-through" : ""}`}>{s.title}</b>
                      <span className={s.kind === "prep" ? "pill-info" : s.dilutive ? "pill" : "pill-success"}>{s.kind === "prep" ? "Prep" : s.dilutive ? "Equity" : "Non-dilutive"}</span>
                    </div>
                    <p className="text-sm text-body">{s.body}</p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                      <Link href={s.href} className="text-sm font-semibold text-brand-text underline">Open</Link>
                      <form action={toggleStep}>
                        <input type="hidden" name="step" value={s.id} />
                        <input type="hidden" name="done" value={isDone ? "0" : "1"} />
                        <button className="btn-ghost btn-sm">{isDone ? "Mark not done" : "Mark done"}</button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="card flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold">Capital stack planner</h2>
          <p className="text-sm text-subtle">Combine sources to reach your target. See the blended cost, how much equity you give up, and when government funding may exceed stacking limits.</p>
        </div>
        <StackBuilder initial={items} target={target} preMoney={saved.pre_money ?? null} />
      </div>

      <p className="text-sm text-subtle">Need numbers first? Try the <Link href="/app/calculators" className="underline">funding calculators</Link>.</p>
    </section>
  );
}

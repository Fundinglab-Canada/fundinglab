import Link from "next/link";
import { FEATURE_PLAN, planName, type Feature } from "@/lib/plans";

/** Shown in place of a gated feature. Links to /pricing with the plan that unlocks it. */
export function UpgradeCard({ feature, title, children }: { feature: Feature; title: string; children?: React.ReactNode }) {
  const plan = FEATURE_PLAN[feature];
  return (
    <div className="card flex flex-col items-start gap-3 border-dashed">
      <span className="pill-info">{planName(plan)} plan</span>
      <h2 className="text-lg font-bold">{title}</h2>
      {children && <div className="text-sm text-body">{children}</div>}
      <div className="flex flex-wrap gap-2">
        <Link href={`/pricing?plan=${plan}`} className="btn-primary btn-sm">See plans</Link>
        <Link href="/contact?topic=General%20question" className="btn-ghost btn-sm">Questions? Contact us</Link>
      </div>
    </div>
  );
}

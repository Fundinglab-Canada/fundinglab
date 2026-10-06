import { BRAND } from "@/lib/constants";
import { IsedFrame } from "./ised-frame";

export const ISED_URL = "https://innovation.ised-isde.canada.ca/s/?language=en_CA";
/** Business Benefits Finder landing page for business groups. */
export const BENEFITS_FINDER_URL = "https://innovation.canada.ca/innovation/s/group-groupe?language=en_CA&token=a0BMm000009zMeLMAU";

/**
 * Checks (server-side, cached for a day) whether the ISED Business Benefits Finder allows framing.
 * Government sites often send X-Frame-Options or CSP frame-ancestors; if so we show the fallback card.
 */
async function embeddable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(4000), next: { revalidate: 86_400 } });
    const xfo = res.headers.get("x-frame-options")?.toLowerCase();
    if (xfo && (xfo.includes("deny") || xfo.includes("sameorigin"))) return false;
    const csp = res.headers.get("content-security-policy")?.toLowerCase() ?? "";
    const fa = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith("frame-ancestors"));
    if (fa) {
      const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").toLowerCase();
      const host = site ? new URL(site).host : "";
      const allowsUs = fa.includes(" *") || (!!host && fa.includes(host));
      if (!allowsUs) return false;
    }
    return res.ok;
  } catch {
    return false;
  }
}

export async function IsedFinder({ compact = false, url = ISED_URL }: { compact?: boolean; url?: string }) {
  const canEmbed = await embeddable(url);
  return (
    <section className="flex flex-col gap-3" aria-labelledby="ised-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="ised-title" className={compact ? "text-xl font-bold" : "text-3xl font-bold"}>Search every Government of Canada business program</h2>
        <a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-text underline" data-track="ised-open-new-tab">Open in new tab ↗</a>
      </div>
      <p className="max-w-measure text-subtle">
        This official Government of Canada tool searches federal, provincial and territorial programs. Answer a few questions to see programs that match your business,
        then bring your shortlist to Funding Lab and we&apos;ll help you apply.
      </p>
      <p className="text-[13px] text-subtle">{BRAND.govToolNote}</p>
      <IsedFrame url={url} canEmbed={canEmbed} />
    </section>
  );
}

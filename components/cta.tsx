import Link from "next/link";
import { CTA } from "@/lib/constants";
import { StickyMobileCta } from "./sticky-cta";

/** The one main ask (§4-0). Emerald button, trust line underneath. */
export function PrimaryCta({ stage, className = "" }: { stage?: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Link href={stage ? `${CTA.href}?stage=${stage}` : CTA.href} className="btn-cta self-start px-6 py-3 text-base">{CTA.label}</Link>
      <span className="text-[13px] text-subtle">{CTA.trust}</span>
    </div>
  );
}

/** Same closing block at the end of every public page, plus the sticky mobile button. */
export function ClosingCta({ secondary }: { secondary?: { href: string; label: string } }) {
  return (
    <>
      <section className="container py-14">
        <div className="flex flex-col items-start gap-4 rounded-xl bg-navy p-8 text-white md:flex-row md:items-center md:justify-between md:p-10">
          <h2 className="max-w-xl text-2xl font-bold text-white md:text-3xl">{CTA.closing}</h2>
          <div className="flex flex-col gap-2">
            <Link href={CTA.href} className="btn-cta px-6 py-3 text-base">{CTA.label}</Link>
            {secondary && <Link href={secondary.href} className="text-sm text-white/85 underline hover:text-white">{secondary.label}</Link>}
            <span className="text-[13px] text-white/75">{CTA.trust}</span>
          </div>
        </div>
      </section>
      <StickyMobileCta />
    </>
  );
}

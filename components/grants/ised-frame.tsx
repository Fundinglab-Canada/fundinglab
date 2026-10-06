"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Responsive iframe with a 5-second load timeout; falls back to a card if blocked or slow (§4F). */
export function IsedFrame({ url, canEmbed }: { url: string; canEmbed: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(!canEmbed);

  useEffect(() => {
    if (!canEmbed) return;
    const t = setTimeout(() => setFailed((f) => f || !loaded), 5000);
    return () => clearTimeout(t);
  }, [canEmbed, loaded]);

  if (failed) {
    return (
      <div className="card flex flex-col items-start gap-3">
        <h3 className="text-xl font-bold">Business Benefits Finder</h3>
        <p className="text-subtle">
          This official Government of Canada tool searches federal, provincial and territorial programs. Answer a few questions to see programs that match your business,
          then bring your shortlist to Funding Lab and we&apos;ll help you apply.
        </p>
        <a href={url} target="_blank" rel="noreferrer" className="btn-primary" data-track="ised-fallback-open">Open the Business Benefits Finder ↗</a>
        <p className="text-sm text-body">Then come back and <Link href="/grants#fit-call" className="font-semibold text-brand-text underline">book your fit call</Link>.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <iframe
        src={url}
        title="Government of Canada Business Benefits Finder"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-[700px] w-full md:h-[900px]"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

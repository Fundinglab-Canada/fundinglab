"use client";

import { useState } from "react";

/** Shows the address as selectable text with a mailto link and a copy button (mailto can be blocked by some clients). */
export function CopyEmail({ email, className = "" }: { email: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-2">
      <a href={`mailto:${email}`} className={className}>{email}</a>
      <button
        type="button"
        className="rounded border border-current/30 px-1.5 text-[11px] opacity-80 hover:opacity-100"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(email);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
        aria-label={`Copy ${email}`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

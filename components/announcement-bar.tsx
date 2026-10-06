"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Dismissible top bar that rotates admin-managed announcements (§4D-E, §4G). */
export function AnnouncementBar({ items }: { items: { id: string; message: string; href: string | null }[] }) {
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("fl_announce_dismissed") === "1") setHidden(true);
    } catch {}
    if (items.length < 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 7000);
    return () => clearInterval(t);
  }, [items.length]);

  if (hidden || !items.length) return null;
  const item = items[index];
  return (
    <div className="bg-navy text-sm text-white no-print" role="region" aria-label="Announcements">
      <div className="container flex items-center gap-3 py-2">
        <p className="flex-1 text-center" aria-live="polite">
          {item.href ? <Link href={item.href} className="font-medium underline-offset-2 hover:underline">{item.message}</Link> : item.message}
        </p>
        <button
          type="button"
          className="rounded px-2 text-white/80 hover:text-white"
          aria-label="Dismiss announcements"
          onClick={() => {
            setHidden(true);
            try { sessionStorage.setItem("fl_announce_dismissed", "1"); } catch {}
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

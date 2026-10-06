"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CTA } from "@/lib/constants";

/** Mobile-only sticky "Create Your Free Account" after the visitor scrolls past the hero (§4-0). */
export function StickyMobileCta() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 p-3 backdrop-blur md:hidden no-print"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <Link href={CTA.href} className="btn-cta w-full py-3 text-base">{CTA.label}</Link>
    </div>
  );
}

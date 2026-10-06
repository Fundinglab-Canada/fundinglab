"use client";

import Link from "next/link";
import { useState } from "react";
import { CTA, PROVINCES } from "@/lib/constants";

/** Public grant-history hook (§4A-5, §4F-6): teaser count only; details unlock with a free account. */
export function GrantTeaser({ compact = false }: { compact?: boolean }) {
  const [name, setName] = useState("");
  const [province, setProvince] = useState("BC");
  const [state, setState] = useState<"idle" | "loading" | "found" | "none" | "error">("idle");
  const [count, setCount] = useState(0);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 4) return;
    setState("loading");
    try {
      const res = await fetch("/api/grants/teaser", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, province }) });
      const data = (await res.json()) as { found?: boolean; count?: number; error?: string };
      if (data.error) return setState("error");
      setCount(data.count ?? 0);
      setState(data.found ? "found" : "none");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={check} className={`flex flex-col gap-2 ${compact ? "" : "sm:flex-row sm:items-end"}`}>
        <label className="field flex-1">Business name
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={4} className="input" placeholder="e.g. Northwind Robotics Inc." autoComplete="organization" />
        </label>
        <label className="field sm:w-28">Province
          <select value={province} onChange={(e) => setProvince(e.target.value)} className="input">
            {PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <button className="btn-primary" disabled={state === "loading"}>{state === "loading" ? "Checking…" : "Check"}</button>
      </form>
      <div aria-live="polite">
        {state === "found" && (
          <div className="flex flex-col gap-2 rounded-lg border border-brand-text/30 bg-brand-soft p-4">
            <b className="text-ink">We found {count} federal grant{count === 1 ? "" : "s"} or contribution{count === 1 ? "" : "s"} linked to that name.</b>
            <span className="text-sm text-body">Create your free account to see your full grant history: programs, departments, amounts and dates.</span>
            <Link href={`${CTA.href}?name=${encodeURIComponent(name)}`} className="btn-cta self-start">{CTA.label}</Link>
          </div>
        )}
        {state === "none" && (
          <p className="text-sm text-subtle">
            Create your free account and we&apos;ll run a deeper check, including possible matches and your CRA business number.{" "}
            <Link href={CTA.href} className="font-semibold text-brand-text underline">Create Your Free Account</Link>
          </p>
        )}
        {state === "error" && <p className="error">The check didn&apos;t run. Try again in a minute.</p>}
        <p className="mt-2 text-[12px] text-subtle">Source: Government of Canada Open Data (federal grants and contributions only).</p>
      </div>
    </div>
  );
}

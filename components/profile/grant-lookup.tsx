"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LookupResult } from "@/lib/grants/classify";
import { BRAND } from "@/lib/constants";
import { dateShort, money } from "@/lib/format";

/**
 * Business-name input that triggers the federal grant lookup on blur.
 * Confirmation is stored in a hidden input; the server re-derives the grants on save.
 */
export function GrantLookupField({
  defaultName,
  defaultEntity,
  getPlace,
}: {
  defaultName: string;
  defaultEntity?: string | null;
  getPlace: () => { province: string | null; city: string | null; businessNumber: string | null };
}) {
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [entity, setEntity] = useState<string>(defaultEntity ?? "");
  const rejected = useRef<string[]>([]);
  const lastQuery = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const run = useCallback(async (name: string, force = false) => {
    const place = getPlace();
    const key = `${name}|${place.province}|${place.city}|${place.businessNumber}`;
    if (!force && key === lastQuery.current) return;
    lastQuery.current = key;
    if (name.trim().length < 3) {
      setResult(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/grants/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ...place, rejected: rejected.current }),
      });
      const data = (await res.json()) as LookupResult;
      setResult(data);
      if (data.state === "match") setEntity(data.entity);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [getPlace]);

  return (
    <div className="flex flex-col gap-3">
      <label className="field">
        Business name
        <input
          id="name"
          name="name"
          required
          defaultValue={defaultName}
          autoComplete="organization"
          className="input"
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => run(v), 600); // debounced lookup (spec: 600 ms)
          }}
          onBlur={(e) => run(e.currentTarget.value)}
        />
        <span className="help">As you type, we check Government of Canada open data for federal grants linked to your business.</span>
      </label>
      <input type="hidden" name="confirmed_grant_entity" value={entity} />

      {loading && <p className="help" aria-live="polite">Checking federal grant records…</p>}

      {!loading && result?.state === "match" && (
        <div className="overflow-hidden rounded-lg border border-brand bg-surface" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-soft px-4 py-3">
            <div>
              <b className="text-brand-text">We found {result.grants.length} federal grant{result.grants.length === 1 ? "" : "s"} for {result.legalName}</b>
              <div className="text-[13px] text-subtle">
                Total federal funding received: <span className="num font-medium text-ink">{money(result.total)}</span>
              </div>
            </div>
            <span className="pill-success">{entity ? "Will be added to your funding history" : "Not added"}</span>
          </div>
          {result.grants.map((g) => (
            <div key={`${g.ownerOrg}:${g.ref}`} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-line px-4 py-3">
              <div>
                <b className="text-ink">{g.program}</b>
                <div className="text-[13px] text-subtle">{g.department} · {dateShort(g.date)}</div>
              </div>
              <div className="num text-right font-medium text-ink">{money(g.amount)}</div>
              {g.description && <p className="col-span-2 text-[13px] text-subtle">{g.description}</p>}
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
            <span className="text-[13px] text-subtle">{BRAND.grantSourceNote}</span>
            {entity ? (
              <button type="button" className="btn-ghost btn-sm" onClick={() => setEntity("")}>Don&apos;t add these</button>
            ) : (
              <button type="button" className="btn-secondary btn-sm" onClick={() => setEntity(result.entity)}>Add to funding history</button>
            )}
          </div>
        </div>
      )}

      {!loading && result?.state === "possible" && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-warning bg-warning-soft px-4 py-3" aria-live="polite">
          <b className="text-ink">Possible matches — is this you?</b>
          {result.candidates.map((c) => (
            <div key={c.entity} className="flex flex-wrap items-center justify-between gap-2 border-t border-warning/25 pt-2 first-of-type:border-0">
              <span>
                <b className="text-ink">{c.legalName}</b>{" "}
                <span className="text-[13px] text-subtle">{[c.city, c.province].filter(Boolean).join(", ")} · {Math.round(c.score * 100)}% name match</span>
              </span>
              <span className="flex gap-2">
                <button type="button" className="btn-primary btn-sm" onClick={async () => {
                  setEntity(c.entity);
                  setLoading(true);
                  const res = await fetch("/api/grants/lookup", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: c.legalName, province: c.province, city: c.city }),
                  });
                  setResult(await res.json());
                  setLoading(false);
                }}>Yes, that&apos;s us</button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => {
                  rejected.current.push(c.entity);
                  const input = document.getElementById("name") as HTMLInputElement | null;
                  run(input?.value ?? "", true);
                }}>Not us</button>
              </span>
            </div>
          ))}
          <span className="text-[13px] text-subtle">{BRAND.grantSourceNote}</span>
        </div>
      )}
      {/* state "none": show nothing, by design */}
    </div>
  );
}

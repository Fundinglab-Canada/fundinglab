"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LookupResult } from "@/lib/grants/classify";
import type { LiveSuggestion } from "@/lib/grants/live";
import { BRAND } from "@/lib/constants";
import { dateShort, money } from "@/lib/format";

/**
 * Business-name input with real-time suggestions from Government of Canada grant records.
 * Picking a suggestion shows that recipient's federal grants; nothing is shown unless a name matches.
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
  const lookupSeq = useRef(0); // only the latest lookup (typed or picked) may update the result
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suggestions, setSuggestions] = useState<LiveSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const suggestSeq = useRef(0);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const suggest = useCallback(async (name: string) => {
    const seq = ++suggestSeq.current;
    if (name.trim().length < 3) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res = await fetch("/api/grants/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = (await res.json()) as { suggestions: LiveSuggestion[] };
      if (seq === suggestSeq.current) setSuggestions(data.suggestions ?? []);
    } catch {
      if (seq === suggestSeq.current) setSuggestions([]);
    } finally {
      if (seq === suggestSeq.current) setSearching(false);
    }
  }, []);

  const pick = useCallback(async (s: LiveSuggestion) => {
    const input = document.getElementById("name") as HTMLInputElement | null;
    if (input) input.value = s.name;
    setSuggestions([]);
    suggestSeq.current++;
    const seq = ++lookupSeq.current;
    setLoading(true);
    try {
      const place = getPlace();
      const res = await fetch("/api/grants/lookup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: s.name, ...place, selected: true }),
      });
      const data = (await res.json()) as LookupResult;
      if (seq !== lookupSeq.current) return;
      setResult(data);
      if (data.state === "match") setEntity(data.entity);
      lastQuery.current = `${s.name}|${place.province}|${place.city}|${place.businessNumber}`;
    } catch {
      if (seq === lookupSeq.current) setResult(null);
    } finally {
      if (seq === lookupSeq.current) setLoading(false);
    }
  }, [getPlace]);

  const run = useCallback(async (name: string, force = false) => {
    const place = getPlace();
    const key = `${name}|${place.province}|${place.city}|${place.businessNumber}`;
    if (!force && key === lastQuery.current) return;
    lastQuery.current = key;
    if (name.trim().length < 3) {
      setResult(null);
      return;
    }
    const seq = ++lookupSeq.current;
    setLoading(true);
    try {
      const res = await fetch("/api/grants/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ...place, rejected: rejected.current }),
      });
      const data = (await res.json()) as LookupResult;
      if (seq !== lookupSeq.current) return;
      setResult(data);
      if (data.state === "match") setEntity(data.entity);
    } catch {
      if (seq === lookupSeq.current) setResult(null);
    } finally {
      if (seq === lookupSeq.current) setLoading(false);
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
            setEntity("");
            setResult(null);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => suggest(v), 400);
          }}
          onBlur={(e) => run(e.currentTarget.value)}
          aria-autocomplete="list"
          aria-controls="grant-suggestions"
        />
        <span className="help">As you type, we search Government of Canada grant records. Pick your business to see federal funding it received.</span>
      </label>

      {searching && <p className="help" aria-live="polite">Searching government records…</p>}
      {!searching && suggestions.length > 0 && (
        <div id="grant-suggestions" className="overflow-hidden rounded-lg border border-line bg-surface" role="listbox" aria-label="Matching businesses in government grant records">
          <div className="flex items-center justify-between gap-2 bg-muted px-4 py-2">
            <b className="text-sm text-ink">Is one of these your business?</b>
            <button type="button" className="text-[13px] text-subtle underline" onClick={() => setSuggestions([])}>None of these</button>
          </div>
          {suggestions.map((s) => (
            <button key={s.name} type="button" role="option" aria-selected={false} onClick={() => pick(s)}
              className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-left hover:bg-brand-soft">
              <span><b className="text-ink">{s.name}</b>{s.location && <span className="block text-[13px] text-subtle">{s.location}</span>}</span>
              <span className="text-[13px] text-subtle">{s.count} grant{s.count === 1 ? "" : "s"} found · select</span>
            </button>
          ))}
          <p className="border-t border-line px-4 py-2 text-[12px] text-subtle">{BRAND.grantSourceNote}</p>
        </div>
      )}
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

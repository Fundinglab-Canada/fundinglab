"use client";

import { useEffect, useState } from "react";

/** Renders a Pacific-time event and, after hydration, the visitor's own local time (§4D). */
export function EventTime({ iso, withDate = true }: { iso: string; withDate?: boolean }) {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = withDate
    ? { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { hour: "numeric", minute: "2-digit" };
  const pt = d.toLocaleString("en-CA", { ...opts, timeZone: "America/Vancouver" });
  const [local, setLocal] = useState<string | null>(null);
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== "America/Vancouver" && tz !== "America/Los_Angeles") {
      setLocal(`${d.toLocaleString("en-CA", { ...opts, timeZoneName: "short" })} your time`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);
  return (
    <span>
      <time dateTime={iso}>{pt} PT</time>
      {local && <span className="block text-[13px] text-subtle">{local}</span>}
    </span>
  );
}

export function Countdown({ to, label = "Starts in" }: { to: string; label?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return null;
  const ms = new Date(to).getTime() - now;
  if (ms <= 0) return <span className="pill-warning">Closed</span>;
  const days = Math.floor(ms / 864e5);
  const hours = Math.floor((ms % 864e5) / 36e5);
  const mins = Math.floor((ms % 36e5) / 6e4);
  return (
    <span className="pill-highlight num">
      {label} {days > 0 ? `${days}d ` : ""}{hours}h {days === 0 ? `${mins}m` : ""}
    </span>
  );
}

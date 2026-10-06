/** Converts a wall-clock time in a time zone to a UTC Date (DST-aware). Pure; safe on client and server. */
export function zonedTime(localIso: string, timeZone: string): Date {
  const guess = new Date(`${localIso.length === 16 ? `${localIso}:00` : localIso}Z`);
  const tzName = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(guess).find((p) => p.type === "timeZoneName")!.value;
  const m = tzName.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  const offsetMin = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
  return new Date(guess.getTime() - offsetMin * 60_000);
}

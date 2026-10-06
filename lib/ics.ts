// Minimal RFC 5545 calendar file generator for webinar and cohort invitations.

export type IcsEvent = { uid: string; start: Date; durationMinutes: number; title: string; description?: string; url?: string };

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds lines to 75 octets as the spec requires. */
const fold = (line: string) => line.match(/.{1,74}/g)!.join("\r\n ");

export function buildIcs(events: IcsEvent[], calName = "Funding Lab"): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Funding Lab//Events//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${esc(calName)}`];
  for (const e of events) {
    const end = new Date(e.start.getTime() + e.durationMinutes * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@fundinglab.ca`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(end)}`,
      fold(`SUMMARY:${esc(e.title)}`),
      ...(e.description ? [fold(`DESCRIPTION:${esc(e.description)}`)] : []),
      ...(e.url ? [fold(`URL:${e.url}`), fold(`LOCATION:${esc(e.url)}`)] : []),
      "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:Reminder", "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function googleCalendarUrl(e: IcsEvent): string {
  const end = new Date(e.start.getTime() + e.durationMinutes * 60_000);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(e.start)}/${stamp(end)}`,
    details: [e.description, e.url].filter(Boolean).join("\n\n"),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

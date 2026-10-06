import "server-only";
import { buildIcs, googleCalendarUrl, type IcsEvent } from "@/lib/ics";
import { env } from "@/lib/env";

export type SessionForInvite = { id: string; starts_at: string; duration_minutes: number; topic: string; join_url?: string | null };

/** The join link is only revealed in emails/ICS sent to registrants, never on the public page. */
export function webinarEvent(s: SessionForInvite): IcsEvent {
  return {
    uid: `webinar-${s.id}`,
    start: new Date(s.starts_at),
    durationMinutes: s.duration_minutes,
    title: `Funding Lab Webinar: ${s.topic}`,
    description: `Free weekly Funding Webinar by the Funding Lab Team.${s.join_url ? `\nJoin: ${s.join_url}` : "\nThe join link will be emailed before the session."}\nManage: ${env.siteUrl()}/webinar`,
    url: s.join_url ?? undefined,
  };
}

export const webinarIcs = (s: SessionForInvite) => buildIcs([webinarEvent(s)], "Funding Lab Webinar");
export const webinarGoogleUrl = (s: SessionForInvite) => googleCalendarUrl(webinarEvent(s));

export const ptString = (iso: string) =>
  new Date(iso).toLocaleString("en-CA", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Vancouver" }) + " PT";

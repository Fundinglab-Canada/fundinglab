import "server-only";
import { createClient } from "@/lib/supabase/server";
import { zonedTime } from "@/lib/time";

export { zonedTime };

// Read helpers for public, admin-managed content. Each returns an empty result if the DB is unreachable,
// so sections simply hide (spec: "hidden until content exists").

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export const getPartnerLogos = () =>
  safe(async () => {
    const s = await createClient();
    const { data } = await s.from("partner_logos").select("id, name, logo_url, website").eq("published", true).order("sort_order");
    return data ?? [];
  }, [] as { id: string; name: string; logo_url: string | null; website: string | null }[]);

export const getTestimonials = () =>
  safe(async () => {
    const s = await createClient();
    const { data } = await s.from("testimonials").select("id, quote, attribution").order("sort_order").limit(6);
    return data ?? [];
  }, [] as { id: string; quote: string; attribution: string }[]);

export const getTeam = () =>
  safe(async () => {
    const s = await createClient();
    const { data } = await s.from("team_members").select("*").order("sort_order");
    return data ?? [];
  }, [] as { id: string; name: string; title: string; member_group: string; bio: string | null; photo_url: string | null; linkedin_url: string | null }[]);

export type WebinarSession = { id: string; starts_at: string; duration_minutes: number; topic: string; description: string | null; speakers: string[]; status: string; has_replay: boolean };

export const getUpcomingWebinars = (limit = 5) =>
  safe(async () => {
    const s = await createClient();
    const { data } = await s
      .from("webinar_sessions_public")
      .select("*")
      .gte("starts_at", new Date(Date.now() - 60 * 60_000).toISOString())
      .order("starts_at")
      .limit(limit);
    return (data ?? []) as WebinarSession[];
  }, [] as WebinarSession[]);

/** Next Tuesday 08:00 America/Vancouver, computed locally when the DB has no sessions yet. */
export function nextTuesdayPt(from = new Date()): Date {
  for (let i = 0; i < 8; i++) {
    const d = new Date(from.getTime() + i * 864e5);
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Vancouver", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)!.value;
    if (get("weekday").startsWith("Tue")) {
      const candidate = zonedTime(`${get("year")}-${get("month")}-${get("day")}T08:00:00`, "America/Vancouver");
      if (candidate.getTime() > from.getTime()) return candidate;
    }
  }
  return new Date(from.getTime() + 7 * 864e5);
}

export type Cohort = { id: string; name: string; start_date: string; end_date: string; price_cad: number; capacity: number; registration_deadline: string | null; status: string };

export const getOpenCohort = () =>
  safe(async () => {
    const s = await createClient();
    const { data } = await s.from("cohorts").select("*").in("status", ["open", "full"]).gte("start_date", new Date().toISOString().slice(0, 10)).order("start_date").limit(1).maybeSingle();
    if (!data) return null;
    const { data: seats } = await s.rpc("fl_cohort_seats", { p_cohort: data.id });
    const seat = (seats as { seats_left: number }[] | null)?.[0];
    return { ...(data as Cohort), seats_left: seat?.seats_left ?? (data as Cohort).capacity };
  }, null as (Cohort & { seats_left: number }) | null);

export const getSiteContent = (key: string, fallback: string) =>
  safe(async () => {
    const s = await createClient();
    const { data } = await s.from("site_content").select("value").eq("key", key).maybeSingle();
    return (data?.value as string) ?? fallback;
  }, fallback);

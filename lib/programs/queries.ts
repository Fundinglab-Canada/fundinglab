import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ProgramRow } from "./types";
import { redip } from "@/content/programs/redip";
import { rtri } from "@/content/programs/rtri";

// Fallback so public pages still render if the database is unreachable (e.g. preview builds).
const FALLBACK = [redip, rtri].map((p, i) => ({
  ...p, id: `fallback-${p.slug}`, is_sample: false, guide_pdf_path: null, featured_order: i + 1,
})) as unknown as ProgramRow[];

export async function getFeaturedPrograms(): Promise<ProgramRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("programs").select("*").eq("is_featured", true).eq("active", true).order("featured_order");
    if (error) throw error;
    return (data ?? []) as ProgramRow[];
  } catch {
    return FALLBACK;
  }
}

export async function getProgramBySlug(slug: string): Promise<ProgramRow | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("programs").select("*").eq("slug", slug).eq("active", true).maybeSingle();
    if (error) throw error;
    return (data as ProgramRow) ?? null;
  } catch {
    return FALLBACK.find((p) => p.slug === slug) ?? null;
  }
}

export function programStatus(p: Pick<ProgramRow, "close_at" | "status_text" | "rolling">) {
  if (p.close_at && new Date(p.close_at).getTime() < Date.now()) {
    return { text: "Intake closed — join the waitlist for the next intake", closed: true };
  }
  return { text: p.status_text ?? (p.rolling ? "Open now" : ""), closed: false };
}

export function needsReverification(lastVerified: string | null) {
  if (!lastVerified) return true;
  return Date.now() - new Date(lastVerified).getTime() > 90 * 864e5;
}

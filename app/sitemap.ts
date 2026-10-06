import type { MetadataRoute } from "next";
import { FUNDING_PATHS, SERVICES } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fundinglab.ca";
  const fixed = ["", "/grants", "/funding-paths", "/webinar", "/road-to-funding", "/assessment", "/services",
    "/partners/join", "/about", "/contact", "/careers", "/privacy", "/terms"];
  const entries: MetadataRoute.Sitemap = [
    ...fixed.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...FUNDING_PATHS.map((p) => ({ url: `${base}/funding-paths/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...SERVICES.map((s) => ({ url: `${base}/services/${s.kind}`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
  try {
    const db = createAdminClient();
    const [{ data: programs }, { data: jobs }] = await Promise.all([
      db.from("programs").select("slug, updated_at").eq("is_featured", true).eq("active", true),
      db.from("jobs").select("slug, updated_at").eq("status", "open"),
    ]);
    for (const p of programs ?? []) entries.push({ url: `${base}/grants/${p.slug}`, lastModified: p.updated_at, changeFrequency: "weekly", priority: 0.9 });
    for (const j of jobs ?? []) entries.push({ url: `${base}/careers/${j.slug}`, lastModified: j.updated_at, changeFrequency: "weekly", priority: 0.5 });
  } catch {
    // Without DB access (e.g. CI build) the static routes are still listed.
    entries.push({ url: `${base}/grants/redip`, priority: 0.9 }, { url: `${base}/grants/rtri`, priority: 0.9 });
  }
  return entries;
}

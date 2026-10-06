import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fundinglab.ca";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/partner", "/admin", "/api", "/b/", "/onboarding", "/auth", "/reset-password"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}

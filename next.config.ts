import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// CSP: no third-party scripts except Cloudflare Turnstile; frames only for Turnstile and the ISED finder embed.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabase.replace(/^http/, "ws")} https://challenges.cloudflare.com`.trim(),
  "frame-src https://challenges.cloudflare.com https://innovation.ised-isde.canada.ca",
  "frame-ancestors 'none'",
  "form-action 'self' https:",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: { "/admin/guide": ["./docs/admin-guide.md"] },
  experimental: { serverActions: { bodySizeLimit: "26mb" } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Phase 0 URLs keep working.
  async redirects() {
    return [
      { source: "/paths", destination: "/funding-paths", permanent: true },
      { source: "/partners/apply", destination: "/partners/join", permanent: true },
      { source: "/dashboard", destination: "/app", permanent: true },
      { source: "/profile", destination: "/app/profile", permanent: true },
      { source: "/snapshot", destination: "/app/share", permanent: true },
      { source: "/admin/matches", destination: "/admin/matching", permanent: true },
      { source: "/admin/orders", destination: "/admin/services", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);

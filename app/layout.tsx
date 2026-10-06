import type { Metadata } from "next";
// Self-hosted fonts (no runtime calls to Google): faster, works offline/CI, and nothing leaks visitor IPs.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BRAND } from "@/lib/constants";
import { NextIntlClientProvider } from "next-intl";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description:
    "Grants, loans, angels, VCs and more for Canadian businesses. Create your free business profile, see where you are in your funding journey, and get matched with the right funding partners.",
  openGraph: { siteName: BRAND.name, locale: "en_CA", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body className="flex min-h-screen flex-col">
        <script
          type="application/ld+json"
          // Organization JSON-LD (§14)
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org", "@type": "Organization", name: BRAND.name, url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://fundinglab.ca",
            logo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://fundinglab.ca"}/brand/funding-lab-logo.png`, areaServed: "CA",
          }) }}
        />
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
          Skip to content
        </a>
        <NextIntlClientProvider>
          <SiteHeader />
          <main id="main" className="flex-1">{children}</main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

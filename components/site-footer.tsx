import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BRAND } from "@/lib/constants";
import { CopyEmail } from "./copy-email";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const COLUMNS: [string, [string, string][]][] = [
    [t("funding"), [["/funding-paths", t("fundingPaths")], ["/grants", t("grantsHub")], ["/assessment", t("assessment")], ["/services", t("services")]]],
    [t("learn"), [["/webinar", t("webinar")], ["/road-to-funding", t("cohort")]]],
    [t("company"), [["/about", t("about")], ["/careers", t("careers")], ["/partners/join", t("partners")], ["/contact", t("contact")]]],
    [t("legal"), [["/privacy", t("privacy")], ["/terms", t("terms")]]],
  ];
  return (
    <footer className="mt-16 bg-navy text-white">
      <div className="container grid gap-8 py-10">
        <div className="grid gap-8 md:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div className="flex flex-col gap-2">
            <span className="font-display text-xl font-extrabold">{BRAND.name}</span>
            <span className="text-white/80">{BRAND.tagline}</span>
            <span className="mt-2 text-sm text-white/90">{BRAND.contactName} · <CopyEmail email={BRAND.contactEmail} className="text-white underline" /></span>
          </div>
          {COLUMNS.map(([title, links]) => (
            <nav key={title} className="flex flex-col gap-1.5 text-sm" aria-label={title}>
              <span className="font-semibold text-white">{title}</span>
              {links.map(([href, label]) => (
                <Link key={href} href={href} className="text-white/80 hover:text-white hover:underline">{label}</Link>
              ))}
            </nav>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-t border-white/15 pt-5 text-[13px] text-white/80">
          <p>{BRAND.disclaimer}</p>
          <p>{t("grantData")} {BRAND.oglNote}</p>
          <p>© {new Date().getFullYear()} {BRAND.name}</p>
        </div>
      </div>
    </footer>
  );
}

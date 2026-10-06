import Link from "next/link";
import { Logo } from "./logo";
import { AnnouncementBar } from "./announcement-bar";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { CTA } from "@/lib/constants";

type NavItem = { href: string; label: string; children?: { href: string; label: string; note?: string }[] };

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const PUBLIC_NAV: NavItem[] = [
    { href: "/funding-paths", label: t("fundingPaths") },
    { href: "/grants", label: t("grants") },
    { href: "/services", label: t("services") },
    { href: "/webinar", label: t("learn"), children: [
      { href: "/webinar", label: t("webinar"), note: t("webinarNote") },
      { href: "/road-to-funding", label: t("cohort"), note: t("cohortNote") },
      { href: "/assessment", label: t("assessment"), note: t("assessmentNote") },
    ] },
    { href: "/about", label: t("about") },
    { href: "/contact", label: t("contact") },
  ];
  const session = await getSessionProfile().catch(() => null);
  const role = session?.profile.role;
  let announcements: { id: string; message: string; href: string | null }[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("announcements").select("id, message, href").order("sort_order").limit(5);
    announcements = data ?? [];
  } catch {
    announcements = [];
  }

  const appNav: NavItem[] =
    role === "admin"
      ? [{ href: "/admin", label: t("admin") }, { href: "/admin/matching", label: t("matching") }, { href: "/admin/pipeline", label: t("pipeline") }, { href: "/admin/leads", label: t("leads") }]
      : role === "partner"
        ? [{ href: "/partner", label: t("dashboard") }, { href: "/partner/deal-flow", label: t("dealFlow") }, { href: "/partner/introductions", label: t("introductions") }]
        : role === "business"
          ? [{ href: "/app", label: t("dashboard") }, { href: "/app/profile", label: t("profile") }, { href: "/app/matches", label: t("introductions") }, { href: "/grants", label: t("grants") }, { href: "/app/services", label: t("services") }]
          : PUBLIC_NAV;

  return (
    <>
      {!role && announcements.length > 0 && <AnnouncementBar items={announcements} />}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur no-print">
        <div className="container flex items-center gap-4 py-2.5">
          <Logo href={role === "admin" ? "/admin" : role === "partner" ? "/partner" : role ? "/app" : "/"} height={40} />
          <nav className="ml-auto hidden items-center gap-0.5 lg:flex" aria-label="Main">
            {appNav.map((item) =>
              item.children ? (
                <details key={item.label} className="group relative">
                  <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-[15px] font-medium hover:bg-muted">{item.label} ▾</summary>
                  <div className="absolute right-0 top-11 z-40 flex w-72 flex-col rounded-lg border border-line bg-surface p-2 shadow-soft">
                    {item.children.map((c) => (
                      <Link key={c.href} href={c.href} className="rounded-md px-3 py-2 hover:bg-muted">
                        <span className="block font-medium text-ink">{c.label}</span>
                        {c.note && <span className="text-[13px] text-subtle">{c.note}</span>}
                      </Link>
                    ))}
                  </div>
                </details>
              ) : (
                <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-[15px] font-medium hover:bg-muted">{item.label}</Link>
              ),
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-2">
            {session ? (
              <form action="/auth/signout" method="post"><button className="btn-secondary btn-sm">{t("logout")}</button></form>
            ) : (
              <>
                <Link href="/login" className="hidden rounded-md px-3 py-2 text-[15px] font-medium hover:bg-muted sm:inline-flex">{t("login")}</Link>
                <Link href={CTA.href} className="btn-cta btn-sm">{CTA.short}</Link>
              </>
            )}
            <details className="relative lg:hidden">
              <summary className="btn-secondary btn-sm list-none" aria-label={t("menu")}>{t("menu")}</summary>
              <nav className="absolute right-0 top-11 z-40 flex w-64 flex-col rounded-lg border border-line bg-surface p-2 shadow-soft" aria-label="Mobile">
                {appNav.flatMap((i) => (i.children ? i.children : [i])).map((i) => (
                  <Link key={i.href + i.label} href={i.href} className="rounded px-3 py-2 hover:bg-muted">{i.label}</Link>
                ))}
                {!session && <Link href="/login" className="rounded px-3 py-2 hover:bg-muted">{t("login")}</Link>}
              </nav>
            </details>
          </div>
        </div>
      </header>
    </>
  );
}

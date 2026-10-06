import Link from "next/link";
import { BRAND } from "@/lib/constants";

const LINKS = [
  ["/paths", "Funding Paths"], ["/services", "Services"], ["/partners/apply", "Become a Partner"],
  ["/about", "About"], ["/contact", "Contact"], ["/privacy", "Privacy Policy"], ["/terms", "Terms"],
];

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-navy text-white">
      <div className="container grid gap-5 py-9">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex flex-col gap-1">
            <span className="font-display text-lg font-extrabold">{BRAND.name}</span>
            <span className="text-white/80">{BRAND.tagline}</span>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-white/85">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-white hover:underline">{label}</Link>
            ))}
          </nav>
        </div>
        <p className="num text-sm">{BRAND.contactLine}</p>
        <p className="border-t border-white/15 pt-4 text-[13px] text-white/80">{BRAND.disclaimer}</p>
      </div>
    </footer>
  );
}

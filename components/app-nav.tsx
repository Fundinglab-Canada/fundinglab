"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Secondary navigation for the signed-in areas (business, partner, admin). Scrolls horizontally on phones. */
export function AppNav({ links, label }: { links: { href: string; label: string }[]; label: string }) {
  const path = usePathname();
  const active = (href: string) => path === href || (href !== links[0].href && path.startsWith(`${href}/`)) || (href !== links[0].href && path === href);
  return (
    <nav aria-label={`${label} navigation`} className="no-print border-b border-line bg-surface">
      <div className="container flex gap-1 overflow-x-auto py-2 text-sm">
        {links.map((l) => (
          <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium ${active(l.href) ? "bg-brand-soft text-brand-text" : "text-subtle hover:bg-muted hover:text-ink"}`}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

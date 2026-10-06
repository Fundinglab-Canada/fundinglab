import Link from "next/link";
import { requireRole } from "@/lib/auth";

export const metadata = { title: { default: "Admin", template: "%s · Admin · Funding Lab" } };

const NAV = [
  ["/admin", "Overview"],
  ["/admin/matches", "Matches"],
  ["/admin/pipeline", "Deal pipeline"],
  ["/admin/businesses", "Businesses"],
  ["/admin/partners", "Partners"],
  ["/admin/orders", "Service orders"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin", "/admin");
  return (
    <div className="container grid items-start gap-6 py-8 md:grid-cols-[200px_minmax(0,1fr)]">
      <nav className="flex gap-1 overflow-x-auto md:sticky md:top-24 md:flex-col" aria-label="Admin">
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className="whitespace-nowrap rounded-md px-3 py-2 text-[15px] font-medium hover:bg-muted">{label}</Link>
        ))}
      </nav>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
    </div>
  );
}

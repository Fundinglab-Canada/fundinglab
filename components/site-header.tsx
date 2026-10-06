import Link from "next/link";
import { Logo } from "./logo";
import { getSessionProfile } from "@/lib/auth";

export async function SiteHeader() {
  const session = await getSessionProfile().catch(() => null);
  const role = session?.profile.role;

  const links =
    role === "admin"
      ? [["/admin", "Admin"], ["/admin/matches", "Matches"], ["/admin/pipeline", "Pipeline"], ["/admin/partners", "Partners"]]
      : role === "partner"
        ? [["/partner", "Introductions"], ["/partner/profile", "Partner profile"]]
        : role === "business"
          ? [["/dashboard", "Dashboard"], ["/profile", "Business profile"], ["/snapshot", "Investor snapshot"], ["/services", "Services"]]
          : [["/paths", "Funding paths"], ["/services", "Services"], ["/partners/apply", "Become a partner"], ["/about", "About"]];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur no-print">
      <div className="container flex items-center gap-4 py-3">
        <Logo href={role === "admin" ? "/admin" : role ? "/dashboard" : "/"} height={36} />
        <details className="relative ml-auto md:hidden">
          <summary className="btn-secondary btn-sm list-none">Menu</summary>
          <nav className="absolute right-0 top-11 flex w-56 flex-col rounded-lg border border-line bg-white p-2 shadow-lg">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="rounded px-3 py-2 hover:bg-muted">{label}</Link>
            ))}
            <AuthLinks signedIn={!!session} />
          </nav>
        </details>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-2 text-[15px] font-medium hover:bg-muted">{label}</Link>
          ))}
          <AuthLinks signedIn={!!session} />
        </nav>
      </div>
    </header>
  );
}

function AuthLinks({ signedIn }: { signedIn: boolean }) {
  return signedIn ? (
    <form action="/auth/signout" method="post">
      <button className="rounded-md px-3 py-2 text-left text-[15px] font-medium hover:bg-muted">Sign out</button>
    </form>
  ) : (
    <>
      <Link href="/login" className="rounded-md px-3 py-2 text-[15px] font-medium hover:bg-muted">Sign in</Link>
      <Link href="/login?next=/profile" className="btn-primary btn-sm ml-1">Get started</Link>
    </>
  );
}

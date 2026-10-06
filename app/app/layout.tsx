import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/profile", label: "Profile" },
  { href: "/app/matches", label: "Introductions" },
  { href: "/app/assessment", label: "Readiness" },
  { href: "/app/share", label: "Share" },
  { href: "/app/services", label: "Services" },
  { href: "/app/cohort", label: "Cohort" },
  { href: "/app/settings", label: "Settings" },
];

export default async function BusinessAppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser("/app");
  if (profile.role === "partner") redirect("/partner");
  if (!profile.onboarded && profile.role !== "admin") redirect("/onboarding?next=/app");
  return (
    <>
      <AppNav links={LINKS} label="Business" />
      {children}
    </>
  );
}

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

export const dynamic = "force-dynamic";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser("/partner");
  if (profile.role === "business") redirect("/app");
  return (
    <>
      <AppNav label="Partner" links={[
        { href: "/partner", label: "Dashboard" },
        { href: "/partner/deal-flow", label: "Deal flow" },
        { href: "/partner/introductions", label: "Introductions" },
        { href: "/partner/profile", label: "Profile" },
      ]} />
      {children}
    </>
  );
}

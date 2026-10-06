import { redirect } from "next/navigation";
import { requireUser, getMyBusiness } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string; stage?: string; role?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireUser("/onboarding");
  const next = safeNext(sp.next);
  if (profile.onboarded) redirect(next);
  if (profile.role === "admin") redirect("/admin");
  const business = await getMyBusiness();
  const role = sp.role === "partner" || profile.role === "partner" || next.startsWith("/partners") ? "partner" : "business";
  return (
    <section className="container flex justify-center py-14">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <div>
          <span className="eyebrow">Welcome to Funding Lab</span>
          <h1 className="mt-2 text-3xl font-extrabold">Let&apos;s set up your account</h1>
          <p className="text-subtle">Under a minute. You can change everything later.</p>
        </div>
        <OnboardingForm next={next} role={role} defaults={{ full_name: profile.full_name ?? "", stage: sp.stage ?? business?.stage ?? "", business_name: business?.name ?? "" }} hasBusiness={!!business} />
      </div>
    </section>
  );
}

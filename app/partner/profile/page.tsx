import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { PartnerForm } from "@/components/partner-form";
import type { PartnerTypeId } from "@/lib/constants";
import { updatePartnerProfile } from "./actions";

export const metadata = { title: "Partner profile" };

export default async function PartnerProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { userId } = await requireUser("/partner/profile");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: p } = await supabase.from("partners").select("*, partner_criteria(*)").eq("user_id", userId).maybeSingle();
  if (!p) redirect("/partners/apply");
  const c = Array.isArray(p.partner_criteria) ? p.partner_criteria[0] : p.partner_criteria;
  return (
    <section className="container flex max-w-3xl flex-col gap-4 py-10">
      <div><span className="eyebrow">Partner profile</span><h1 className="mt-1 text-3xl font-bold">Your private partner profile</h1>
        <p className="text-sm text-subtle">Only Funding Lab admins see this. Businesses see your name and type after an approved introduction, and contact details only after both sides accept.</p></div>
      {sp.saved && <p className="pill-success self-start px-4 py-2 text-sm">Profile saved.</p>}
      <PartnerForm
        action={updatePartnerProfile}
        submitLabel="Save profile"
        showTerms={false}
        defaults={{ ...p, type: p.type as PartnerTypeId, stages: c?.stages ?? [], industries: c?.industries ?? [], provinces: c?.provinces ?? [] }}
      />
    </section>
  );
}

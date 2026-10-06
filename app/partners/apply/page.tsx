import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { PartnerForm } from "@/components/partner-form";
import { Icon } from "@/components/icons";
import { applyAsPartner } from "./actions";

export const metadata = { title: "Become a partner" };

export default async function BecomePartnerPage() {
  const session = await getSessionProfile();
  let existing: { status: string } | null = null;
  if (session) {
    const supabase = await createClient();
    const { data } = await supabase.from("partners").select("status").eq("user_id", session.userId).maybeSingle();
    existing = data;
  }
  return (
    <section className="container grid items-start gap-10 py-14 lg:grid-cols-[1fr_1.2fr]">
      <div className="flex flex-col gap-4">
        <span className="eyebrow">Become a partner</span>
        <h1 className="text-4xl font-extrabold">Meet pre-qualified Canadian businesses</h1>
        <p className="text-subtle">
          Funders and service experts receive matched, consented introductions. Your profile is private: it is never shown to visitors or businesses,
          and contact details are released only after both sides accept.
        </p>
        <ul className="flex flex-col gap-2">
          {["Admin-approved network, reviewed before activation", "Matches scored on stage, industry, geography, cheque size and use of funds",
            "Deal tracking from introduction to close", "Optional membership tiers and success-fee arrangements"].map((t) => (
            <li key={t} className="flex items-start gap-2"><Icon name="check" className="mt-1 text-teal" />{t}</li>
          ))}
        </ul>
      </div>
      {!session ? (
        <div className="card flex flex-col gap-3">
          <h2 className="text-xl font-bold">Start your application</h2>
          <p className="text-sm text-subtle">Sign in first so you can manage introductions later.</p>
          <Link href="/login?role=partner&next=/partners/apply" className="btn-primary self-start">Sign in to apply</Link>
        </div>
      ) : existing ? (
        <div className="card flex flex-col gap-2">
          <h2 className="text-xl font-bold">{existing.status === "active" ? "Your partner profile is active" : "Application received"}</h2>
          <p className="text-sm text-subtle">{existing.status === "active" ? "Manage introductions from your partner dashboard." : "Funding Lab reviews new partners within three business days."}</p>
          <Link href="/partner" className="btn-secondary self-start">Go to partner dashboard</Link>
        </div>
      ) : (
        <PartnerForm action={applyAsPartner} submitLabel="Submit for approval" />
      )}
    </section>
  );
}

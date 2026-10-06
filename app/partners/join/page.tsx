import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { PartnerForm } from "@/components/partner-form";
import { PARTNER_TYPES, type PartnerTypeId } from "@/lib/constants";
import { applyAsPartner } from "./actions";

export const metadata = { title: "Become a partner", description: "Funders, lenders and service experts: meet pre-qualified Canadian businesses through private, consented introductions." };

const GROUPS: { label: string; ids: PartnerTypeId[] }[] = [
  { label: "Capital", ids: ["angel_investor", "venture_capital", "private_equity", "lending_partner", "crowdfunding_platform"] },
  { label: "Funding experts", ids: ["grant_writer", "ipo_expert", "ma_expert", "commercial_lawyer", "fractional_cpa"] },
  { label: "Growth partners", ids: ["development_expert", "marketing_expert", "recruiter"] },
];

export default async function JoinPartnersPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const sp = await searchParams;
  const type = PARTNER_TYPES.find((t) => t.id === sp.type)?.id;
  const session = await getSessionProfile().catch(() => null);
  let existing: { status: string } | null = null;
  if (session) {
    const supabase = await createClient();
    existing = (await supabase.from("partners").select("status").eq("user_id", session.userId).maybeSingle()).data;
  }
  return (
    <section className="container grid items-start gap-10 py-14 lg:grid-cols-[.9fr_1.1fr]">
      <div className="flex flex-col gap-4">
        <span className="eyebrow">Become a partner</span>
        <h1 className="text-4xl font-extrabold">Meet pre-qualified Canadian businesses</h1>
        <p className="text-body">
          Funders and service experts receive curated, consented introductions. Your profile is private: it is never shown to visitors or businesses,
          and names and contact details are shared only after both sides accept.
        </p>
        <ul className="flex flex-col gap-2">
          {["Every partner reviewed by the Funding Lab Team before activation", "Anonymized deal flow scored on stage, industry, geography, ticket size and use of funds",
            "Introductions expire after 14 days, so nothing sits in limbo", "Deal tracking from introduction to funded"].map((t) => (
            <li key={t} className="flex items-start gap-2"><span className="text-brand-text">✓</span>{t}</li>
          ))}
        </ul>
      </div>
      {!session ? (
        <div className="card flex flex-col gap-4">
          <h2 className="text-xl font-bold">Which best describes you?</h2>
          {GROUPS.map((g) => (
            <div key={g.label} className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-subtle">{g.label}</span>
              <div className="flex flex-wrap gap-2">
                {g.ids.map((id) => (
                  <Link key={id} href={`/signup?role=partner&next=${encodeURIComponent(`/partners/join?type=${id}`)}`} className="btn-secondary btn-sm">
                    {PARTNER_TYPES.find((t) => t.id === id)?.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <p className="text-sm text-subtle">You&apos;ll create a free account first so you can manage introductions. Already have one? <Link href="/login?next=/partners/join" className="underline">Log in</Link>.</p>
        </div>
      ) : existing ? (
        <div className="card flex flex-col gap-2">
          <h2 className="text-xl font-bold">{existing.status === "active" ? "Your partner profile is active" : "Application received"}</h2>
          <p className="text-sm text-subtle">{existing.status === "active" ? "Review curated deal flow from your partner dashboard." : "The Funding Lab Team reviews new partners within three business days."}</p>
          <Link href="/partner" className="btn-secondary self-start">Go to partner dashboard</Link>
        </div>
      ) : (
        <PartnerForm action={applyAsPartner} submitLabel="Submit for approval" defaults={{ type, contact_email: session.profile.email, contact_person: session.profile.full_name }} />
      )}
    </section>
  );
}

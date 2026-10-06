import { BRAND } from "@/lib/constants";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <section className="container flex max-w-measure flex-col gap-4 py-14">
      <span className="eyebrow">Privacy Policy</span>
      <h1 className="text-4xl font-extrabold">How we handle your information</h1>
      <p className="pill-warning self-start">Draft for legal review before launch.</p>
      <p>Funding Lab follows the Personal Information Protection and Electronic Documents Act (PIPEDA). We collect only what we need to assess funding readiness and to make introductions you agree to.</p>
      <h2 className="text-xl font-bold">Consent</h2>
      <p>Matching and profile sharing each need separate consent, which you can withdraw at any time from your profile. We never introduce you to a partner without it, and partner contact details are shared only after both sides accept.</p>
      <h2 className="text-xl font-bold">Government grant data</h2>
      <p>Grant history comes from the Government of Canada Proactive Disclosure – Grants and Contributions dataset, published under the Open Government Licence – Canada. It covers federal awards only. Records about individuals are excluded from our copy.</p>
      <h2 className="text-xl font-bold">Security</h2>
      <p>Documents are stored in a private, encrypted bucket. Access is role-based, enforced in the database, and logged. Share-link analytics store a one-way hash of the viewer&apos;s IP address, never the address itself.</p>
      <h2 className="text-xl font-bold">Your rights</h2>
      <p>You can ask to see, correct or delete your information. Contact us using the details below.</p>
      <p className="num text-sm text-subtle">{BRAND.contactLine}</p>
    </section>
  );
}

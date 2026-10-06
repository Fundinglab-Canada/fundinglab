import { BRAND, CONTACT_ROLES, CONTACT_TOPICS } from "@/lib/constants";
import { CopyEmail } from "@/components/copy-email";
import { Turnstile } from "@/components/turnstile";
import { ClosingCta } from "@/components/cta";
import { ContactForm } from "./contact-form";

export const metadata = { title: "Contact the Funding Lab Team" };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  return (
    <>
      <section className="container grid items-start gap-10 py-14 lg:grid-cols-[.8fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <span className="eyebrow">Contact</span>
          <h1 className="text-4xl font-extrabold">Contact the Funding Lab Team</h1>
          <p className="text-[17px] text-body">
            Questions about funding, grants, partnerships or our programs? Send us a message and the Funding Lab Team will get back to you within 1–2 business days.
          </p>
          <div className="card flex flex-col gap-1">
            <b className="text-ink">{BRAND.contactName}</b>
            <CopyEmail email={BRAND.contactEmail} className="font-medium text-brand-text underline" />
          </div>
        </div>
        <ContactForm roles={[...CONTACT_ROLES]} topics={[...CONTACT_TOPICS]} defaultTopic={topic} turnstile={<Turnstile />} />
      </section>
      <ClosingCta />
    </>
  );
}

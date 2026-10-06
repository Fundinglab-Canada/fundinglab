import { BRAND } from "@/lib/constants";

export const metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <section className="container flex max-w-measure flex-col gap-4 py-14">
      <span className="eyebrow">Terms of Use</span>
      <h1 className="text-4xl font-extrabold">Terms of use</h1>
      <p className="pill-warning self-start">Draft for legal review before launch.</p>
      <p>{BRAND.disclaimer}</p>
      <h2 className="text-xl font-bold">No advice</h2>
      <p>Readiness scores, recommended funding paths and match suggestions are information, not financial, legal, tax or investment advice.</p>
      <h2 className="text-xl font-bold">Introductions</h2>
      <p>Funding Lab makes introductions between businesses and partners who have both agreed to them. We do not negotiate, hold funds or participate in any securities transaction.</p>
      <h2 className="text-xl font-bold">Fees</h2>
      <p>Service fees are shown before purchase. Any success fee is disclosed and agreed in writing before an introduction is made.</p>
    </section>
  );
}

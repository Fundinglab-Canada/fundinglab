import { getSessionProfile } from "@/lib/auth";
import { ServiceCatalog } from "@/components/services/catalog";
import { PayNowBar } from "@/components/services/pay-now-bar";
import { ClosingCta } from "@/components/cta";

export const metadata = { title: "Services", description: "Get funded and grow with your funding: data rooms, business plans, grant writing, loan packages, product development, marketing, recruitment and IP filing." };

export default async function ServicesPage() {
  const session = await getSessionProfile().catch(() => null);
  return (
    <>
      <PayNowBar signedIn={!!session} />
      <section className="container flex flex-col gap-8 py-12 md:py-14">
        <div className="max-w-measure">
          <span className="eyebrow">Services</span>
          <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Help to get funded, and to grow once you are</h1>
          <p className="mt-3 text-subtle">Delivered by the Funding Lab Team and vetted partners. Tell us what you need and we&apos;ll send a written quote, or book a free 15-minute meeting to talk it through.</p>
        </div>
        <ServiceCatalog />
      </section>
      <ClosingCta />
    </>
  );
}

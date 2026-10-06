import { getSessionProfile } from "@/lib/auth";
import { ServiceCatalog } from "@/components/services/catalog";
import { ClosingCta } from "@/components/cta";

export const metadata = { title: "Services", description: "Get funded and grow with your funding: data rooms, business plans, grant writing, loan packages, hiring, development and marketing." };

export default async function ServicesPage() {
  const session = await getSessionProfile().catch(() => null);
  return (
    <>
      <section className="container flex flex-col gap-8 py-14">
        <div className="max-w-measure">
          <span className="eyebrow">Services</span>
          <h1 className="mt-2 text-4xl font-extrabold">Help to get funded, and to grow once you are</h1>
          <p className="mt-3 text-subtle">Fixed-scope services delivered by the Funding Lab Team and vetted partners. Pay a deposit by card or request a custom quote.</p>
        </div>
        <ServiceCatalog mode="public" signedIn={!!session} />
      </section>
      <ClosingCta />
    </>
  );
}

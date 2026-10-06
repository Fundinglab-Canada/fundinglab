export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <section className="container flex max-w-measure flex-col gap-4 py-14">
      <span className="eyebrow">About</span>
      <h1 className="text-4xl font-extrabold">Built by people who have raised, granted and lent</h1>
      <p>
        Funding Lab connects Canadian businesses with the capital that fits their stage, from a first federal grant to an exit.
        We combine Government of Canada open data, a structured readiness assessment and a private, vetted partner network.
      </p>
      <p>
        Matching is done by our team, not by an algorithm alone. Every introduction is reviewed, accepted by both sides and tracked until it closes.
      </p>
      <h2 className="mt-4 text-2xl font-bold">Our network</h2>
      <p>Angel groups, venture and private equity firms, lenders, grant writers, lawyers and fractional CPAs across Canada.</p>
    </section>
  );
}

import Link from "next/link";
import { getSiteContent, getTeam } from "@/lib/content";
import { ClosingCta } from "@/components/cta";

export const metadata = { title: "About Us", description: "Funding Lab exists so no good business fails for lack of access to the right capital." };

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" className="h-20 w-20 rounded-full object-cover" />;
  }
  const initials = name.replace(/\(.*?\)/g, "").split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("");
  return <span className="grid h-20 w-20 place-items-center rounded-full bg-navy font-display text-xl font-bold text-white" aria-hidden>{initials}</span>;
}

export default async function AboutPage() {
  const [team, story] = await Promise.all([getTeam(), getSiteContent("about_story", "")]);
  const groups: [string, string][] = [["founder", "Founders"], ["advisor", "Advisors"], ["team", "Team"]];
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="container flex max-w-4xl flex-col gap-4 py-14">
          <span className="eyebrow">About Funding Lab</span>
          <h1 className="text-4xl font-extrabold">Every funding path. One place. Start to finish.</h1>
          <p className="text-[17px] text-body">
            Funding Lab exists so no good business fails for lack of access to the right capital. We bring every funding path — grants, loans,
            investors and expert help — into one place, and guide businesses from first idea to exit.
          </p>
        </div>
      </section>
      <section className="container grid gap-8 py-12 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold">Our story</h2>
          <p className="text-body">
            {story ||
              "Our founders spent years in B.C.'s startup, angel and venture ecosystem and saw businesses miss funding they qualified for. Funding Lab puts the whole journey in one place."}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold">What makes us different</h2>
          <ul className="grid gap-3">
            {[["One-stop platform", "Grants, loans, investors and expert services in one profile."],
              ["Private, curated matching", "Our team reviews every match. Names are shared only when both sides agree."],
              ["Support before, during and after funding", "From readiness to reporting to your next round."]].map(([t, d]) => (
              <li key={t} className="card"><b className="text-ink">{t}</b><p className="text-sm text-subtle">{d}</p></li>
            ))}
          </ul>
        </div>
      </section>
      {groups.map(([g, label]) => {
        const members = team.filter((m) => m.member_group === g);
        if (!members.length) return null;
        return (
          <section key={g} className="container flex flex-col gap-5 pb-12">
            <h2 className="text-2xl font-bold">{label}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m) => (
                <article key={m.id} className="card flex flex-col items-start gap-3">
                  <Avatar name={m.name} photo={m.photo_url} />
                  <div><h3 className="text-lg font-bold">{m.name}</h3><p className="text-sm font-medium text-brand-text">{m.title}</p></div>
                  <p className="text-sm text-subtle">{m.bio ?? "[Bio to be added]"}</p>
                  {m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noreferrer" className="text-sm underline">LinkedIn ↗</a>}
                </article>
              ))}
            </div>
          </section>
        );
      })}
      <section className="container pb-4"><Link href="/careers" className="font-semibold text-brand-text underline">Join our team →</Link></section>
      <ClosingCta secondary={{ href: "/partners/join", label: "Become a Partner" }} />
    </>
  );
}

import Link from "next/link";
import { getUpcomingWebinars, nextTuesdayPt } from "@/lib/content";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventTime, Countdown } from "@/components/local-time";
import { ClosingCta } from "@/components/cta";
import { Turnstile } from "@/components/turnstile";
import { WebinarRegisterForm } from "./register-form";
import { ptString } from "@/lib/webinar";

export const metadata = {
  title: "Free Funding Webinar — every Tuesday 8 AM PT",
  description: "A free live webinar every Tuesday at 8:00 AM Pacific: which funding fits your business, and how to get ready for it.",
};
export const revalidate = 300;

const LEARN = [
  "Which funding fits your stage: grants, loans, angels, VCs, crowdfunding",
  "What funders look for, and the documents they ask for",
  "How to find grants you qualify for, including B.C. and federal programs",
  "Live Q&A with the Funding Lab Team",
];

async function getReplays() {
  try {
    const { data } = await createAdminClient()
      .from("webinar_sessions").select("id, starts_at, topic, replay_url").not("replay_url", "is", null).order("starts_at", { ascending: false }).limit(6);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function WebinarPage() {
  const [sessions, user] = await Promise.all([getUpcomingWebinars(5), getSessionProfile().catch(() => null)]);
  const upcoming = sessions.filter((s) => s.status === "scheduled" && new Date(s.starts_at).getTime() > Date.now());
  const next = upcoming[0];
  const nextIso = next?.starts_at ?? nextTuesdayPt().toISOString();
  const replays = user ? await getReplays() : [];
  const jsonLd = next && {
    "@context": "https://schema.org", "@type": "Event", name: `Funding Lab Webinar: ${next.topic}`, startDate: next.starts_at,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode", eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "VirtualLocation", url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://fundinglab.ca"}/webinar` },
    isAccessibleForFree: true, organizer: { "@type": "Organization", name: "Funding Lab" },
  };

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <section className="border-b border-line bg-surface">
        <div className="container grid items-start gap-10 py-14 lg:grid-cols-[1.1fr_.9fr]">
          <div className="flex flex-col gap-5">
            <span className="eyebrow">Free Funding Webinar</span>
            <h1 className="text-4xl font-extrabold md:text-5xl">Every Tuesday, 8:00 AM Pacific. Free.</h1>
            <p className="text-lg text-body">One hour on which funding fits your business and how to get ready for it, with live Q&amp;A.</p>
            <div className="card flex flex-col gap-2">
              <span className="text-sm font-semibold text-subtle">Next session</span>
              <span className="text-lg font-bold text-ink"><EventTime iso={nextIso} /></span>
              {next && <span className="text-body">{next.topic}</span>}
              <Countdown to={nextIso} />
            </div>
            <div>
              <h2 className="mb-2 text-xl font-bold">What you&apos;ll learn</h2>
              <ul className="grid gap-2">{LEARN.map((t) => <li key={t} className="flex gap-2"><span className="text-brand-text">✓</span>{t}</li>)}</ul>
            </div>
          </div>
          <div id="register" className="lg:sticky lg:top-24">
            <WebinarRegisterForm
              sessions={upcoming.map((s) => ({ id: s.id, label: ptString(s.starts_at) }))}
              defaults={{ name: user?.profile.full_name ?? "", email: user?.profile.email ?? "" }}
              turnstile={<Turnstile />}
            />
          </div>
        </div>
      </section>

      <section className="container flex flex-col gap-4 py-12">
        <h2 className="text-2xl font-bold">Coming up</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {upcoming.slice(0, 4).map((s) => (
            <article key={s.id} className="card flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink"><EventTime iso={s.starts_at} /></span>
              <p className="text-body">{s.topic}</p>
              <a href={`/api/webinar/${s.id}/ics`} className="mt-auto text-sm text-brand-text underline">Add to calendar</a>
            </article>
          ))}
          {!upcoming.length && <p className="text-subtle">The schedule is being published. Sessions run every Tuesday at 8:00 AM PT.</p>}
        </div>
      </section>

      <section className="container flex flex-col gap-4 pb-12">
        <h2 className="text-2xl font-bold">Replays</h2>
        {user ? (
          replays.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {replays.map((r) => (
                <li key={r.id} className="card flex items-center justify-between gap-3">
                  <span><b className="text-ink">{r.topic}</b><span className="block text-sm text-subtle">{new Date(r.starts_at).toLocaleDateString("en-CA", { dateStyle: "medium", timeZone: "America/Vancouver" })}</span></span>
                  <a href={r.replay_url!} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">Watch</a>
                </li>
              ))}
            </ul>
          ) : <p className="text-subtle">Replays appear here after each session.</p>
        ) : (
          <div className="card flex flex-wrap items-center justify-between gap-3">
            <span className="text-body">Replays are free for members.</span>
            <Link href="/signup?next=/webinar" className="btn-secondary btn-sm">Create a free account to watch</Link>
          </div>
        )}
      </section>

      <ClosingCta secondary={{ href: "/road-to-funding", label: "Want more? Join the 8-week Road to Funding cohort" }} />
    </>
  );
}

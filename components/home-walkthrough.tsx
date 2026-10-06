"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const SCENE_MS = 4500;

type Scene = { title: string; caption: string; cta?: { href: string; label: string }; screen: React.ReactNode };

function Field({ label, value, typing }: { label: string; value: string; typing?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{label}</span>
      <span className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white">
        {value}{typing && <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-brand" />}
      </span>
    </div>
  );
}

const SCENES: Scene[] = [
  {
    title: "1. Create your free profile",
    caption: "Two minutes to start. Tell us your business name, province and industry.",
    cta: { href: "/signup", label: "Create free profile" },
    screen: (
      <div className="grid w-full max-w-sm gap-3">
        <Field label="Business name" value="Maple Pantry Foods" typing />
        <div className="grid grid-cols-2 gap-3"><Field label="Province" value="BC" /><Field label="Industry" value="Agriculture & Food" /></div>
        <span className="mt-1 self-start rounded-md bg-brand px-4 py-2 text-sm font-bold text-navy">Save and continue</span>
      </div>
    ),
  },
  {
    title: "2. We check your grant history",
    caption: "We search Government of Canada open data and show federal grants linked to your business.",
    screen: (
      <div className="w-full max-w-sm overflow-hidden rounded-lg border border-brand/60 bg-white/5">
        <div className="bg-brand/20 px-4 py-2.5 text-sm font-bold text-brand">We found 2 federal grants</div>
        {[["NRC IRAP", "$72,000"], ["CanExport SMEs", "$35,000"]].map(([p, a]) => (
          <div key={p} className="flex justify-between border-t border-white/10 px-4 py-2.5 text-sm text-white"><span>{p}</span><b className="num">{a}</b></div>
        ))}
      </div>
    ),
  },
  {
    title: "3. Take the free Funding Check",
    caption: "21 quick questions give you a readiness score, your gaps, and the funding paths that fit.",
    cta: { href: "/assessment", label: "Start the Funding Check" },
    screen: (
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-28 w-28 place-items-center rounded-full border-8 border-brand/30 border-t-brand">
          <span className="num text-3xl font-extrabold text-white">72</span>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {["Grants", "Angels", "Business loans"].map((p) => <span key={p} className="rounded-full bg-brand/20 px-3 py-1 text-xs font-semibold text-brand">{p}</span>)}
        </div>
      </div>
    ),
  },
  {
    title: "4. Get matched privately",
    caption: "Our team introduces you to vetted funders and experts. Names are shared only when both sides agree.",
    screen: (
      <div className="grid w-full max-w-sm gap-2">
        {[["Angel investor · B.C.", "92% fit"], ["Credit union lender", "88% fit"], ["Grant writer", "85% fit"]].map(([n, f]) => (
          <div key={n} className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white"><span>{n}</span><span className="font-bold text-brand">{f}</span></div>
        ))}
      </div>
    ),
  },
  {
    title: "5. Apply with our team",
    caption: "Request a quote for grant writing, a business plan or a data room — or book a free 15-minute meeting.",
    cta: { href: "/services", label: "Explore services" },
    screen: (
      <div className="flex flex-col items-center gap-3">
        <span className="rounded-md bg-brand px-5 py-2.5 text-sm font-bold text-navy">Request a quote</span>
        <span className="rounded-md border border-white/40 px-5 py-2.5 text-sm font-bold text-white">Book a 15-min meeting</span>
      </div>
    ),
  },
];

/** Homepage "how to use Funding Lab" walkthrough: an animated, video-style player with captions. */
export function HomeWalkthrough() {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState(false);
  const started = useRef(false);

  // Autoplay once it scrolls into view, unless the visitor prefers reduced motion.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !ref.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) { started.current = true; setPlaying(true); }
    }, { threshold: 0.5 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setElapsed((e) => e + 100), 100);
    return () => clearInterval(t);
  }, [playing]);

  useEffect(() => {
    if (elapsed < SCENE_MS) return;
    if (i + 1 < SCENES.length) { setI(i + 1); setElapsed(0); }
    else { setPlaying(false); setEnded(true); setElapsed(SCENE_MS); }
  }, [elapsed, i]);

  const go = (n: number) => { setI(n); setElapsed(0); setEnded(false); };
  const scene = SCENES[i];

  return (
    <div ref={ref} className="overflow-hidden rounded-xl bg-navy shadow-soft">
      <div className="relative flex aspect-[4/3] flex-col items-center justify-center gap-5 px-5 py-8 sm:aspect-video" aria-live="polite">
        <span className="absolute left-4 top-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">How Funding Lab works</span>
        <div key={i} className="flex w-full animate-[fadeIn_.5s_ease] flex-col items-center gap-5">
          <h3 className="text-center text-xl font-bold text-white md:text-2xl">{scene.title}</h3>
          {scene.screen}
        </div>
        {ended && (
          <button type="button" onClick={() => { go(0); setPlaying(true); }} className="absolute inset-0 grid place-items-center bg-navy/80 text-lg font-bold text-white">↻ Watch again</button>
        )}
      </div>
      <div className="flex flex-col gap-3 border-t border-white/10 bg-black/20 px-4 py-3">
        <p className="min-h-[2.5rem] text-sm text-white/85">{scene.caption}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { if (ended) go(0); started.current = true; setPlaying((p) => (ended ? true : !p)); }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-navy"
            aria-label={playing ? "Pause walkthrough" : "Play walkthrough"}
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <div className="flex flex-1 gap-1.5" role="tablist" aria-label="Walkthrough steps">
            {SCENES.map((s, n) => (
              <button key={s.title} type="button" role="tab" aria-selected={n === i} aria-label={s.title} onClick={() => go(n)} className="h-1.5 flex-1 overflow-hidden rounded bg-white/20">
                <i className="block h-full bg-brand transition-[width] duration-100" style={{ width: n < i ? "100%" : n === i ? `${(elapsed / SCENE_MS) * 100}%` : "0%" }} />
              </button>
            ))}
          </div>
          {scene.cta && <Link href={scene.cta.href} className="hidden shrink-0 text-sm font-semibold text-brand underline sm:inline">{scene.cta.label} →</Link>}
        </div>
      </div>
    </div>
  );
}

/** Admin-set video (YouTube or .mp4) replaces the animated walkthrough. */
export function HomeVideo({ url }: { url: string }) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) {
    return (
      <div className="overflow-hidden rounded-xl bg-navy shadow-soft">
        <iframe className="aspect-video w-full" src={`https://www.youtube-nocookie.com/embed/${yt[1]}`} title="How Funding Lab works" loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  return <video className="aspect-video w-full rounded-xl bg-navy shadow-soft" src={url} controls playsInline preload="metadata" />;
}

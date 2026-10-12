import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/auth";
import { PITCH_OUTLINE } from "@/lib/prep";
import { dateShort } from "@/lib/format";

export const metadata = { title: "Pitch deck" };

export default async function PitchDeckPage() {
  const { business } = await requireBusinessContext("/app/prep/pitch-deck");
  const supabase = await createClient();
  const { data: decks } = await supabase.from("documents").select("id, file_name, created_at, version").eq("business_id", business.id).eq("kind", "pitch_deck").order("created_at", { ascending: false });
  return (
    <section className="container flex max-w-4xl flex-col gap-6 py-10">
      <Link href="/app/prep" className="text-sm text-subtle hover:underline">← Prep Studio</Link>
      <div>
        <span className="eyebrow">Pitch deck</span>
        <h1 className="mt-1 text-3xl font-bold">The 12-slide investor deck</h1>
        <p className="max-w-measure text-subtle">Investors spend about three minutes on a first read. One idea per slide, numbers over adjectives, and your strongest proof (usually traction) early.</p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2">
        {PITCH_OUTLINE.map((s, i) => (
          <li key={s.title} className="card flex gap-3">
            <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand-text">{i + 1}</span>
            <span><b className="text-ink">{s.title}</b><span className="block text-sm text-body">{s.tip}</span></span>
          </li>
        ))}
      </ol>
      <div className="card flex flex-col gap-3">
        <h2 className="text-lg font-bold">Your deck</h2>
        {decks?.length ? (
          <ul className="flex flex-col gap-1 text-sm">{decks.map((d) => <li key={d.id}><a href={`/api/documents/${d.id}`} className="font-semibold underline">{d.file_name}</a> <span className="text-subtle">· {dateShort(d.created_at)}</span></li>)}</ul>
        ) : <p className="text-sm text-subtle">No deck uploaded yet.</p>}
        <div className="flex flex-wrap gap-2">
          <Link href="/app/profile?step=6" className="btn-primary btn-sm">Upload your deck</Link>
          <Link href="/services/pitch_deck?from=prep" className="btn-secondary btn-sm">Get it reviewed</Link>
        </div>
      </div>
    </section>
  );
}

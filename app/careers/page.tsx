import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEPARTMENTS, JOB_TYPES, jobTypeLabel } from "@/lib/constants";
import { ClosingCta } from "@/components/cta";

export const metadata = { title: "Careers", description: "Help businesses get funded. Build your career with Funding Lab." };

type Job = { id: string; title: string; slug: string; department: string; job_type: string; location: string; remote_option: string; closes_at: string | null };

export default async function CareersPage({ searchParams }: { searchParams: Promise<{ department?: string; type?: string; location?: string }> }) {
  const sp = await searchParams;
  let jobs: Job[] = [];
  try {
    const supabase = await createClient();
    let q = supabase.from("jobs").select("id, title, slug, department, job_type, location, remote_option, closes_at").eq("status", "open").order("posted_at", { ascending: false });
    if (sp.department) q = q.eq("department", sp.department);
    if (sp.type) q = q.eq("job_type", sp.type);
    if (sp.location) q = q.eq("remote_option", sp.location);
    jobs = ((await q).data ?? []) as Job[];
  } catch {}
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="container flex max-w-4xl flex-col gap-4 py-14">
          <span className="eyebrow">Careers</span>
          <h1 className="text-4xl font-extrabold">Help businesses get funded. Build your career with Funding Lab.</h1>
          <ul className="grid gap-2 text-body sm:grid-cols-2">
            {["Mission-driven work that helps businesses grow", "Exposure to investors, lenders and founders across Canada", "Flexible and remote options", "Grow with an early-stage platform"].map((t) => <li key={t} className="flex gap-2"><span className="text-brand-text">✓</span>{t}</li>)}
          </ul>
          <Link href="/careers/apply" className="btn-secondary self-start">Send a general application</Link>
        </div>
      </section>
      <section className="container flex flex-col gap-5 py-12">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="field">Department<select name="department" defaultValue={sp.department ?? ""} className="input"><option value="">All</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select></label>
          <label className="field">Type<select name="type" defaultValue={sp.type ?? ""} className="input"><option value="">All</option>{JOB_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
          <label className="field">Location<select name="location" defaultValue={sp.location ?? ""} className="input"><option value="">All</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></label>
          <button className="btn-secondary">Filter</button>
        </form>
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((j) => (
            <article key={j.id} className="card flex flex-col gap-2">
              <div className="flex flex-wrap gap-2"><span className="pill">{jobTypeLabel(j.job_type)}</span><span className="pill">{j.remote_option}</span></div>
              <h2 className="text-xl font-bold">{j.title}</h2>
              <p className="text-sm text-subtle">{j.department} · {j.location}</p>
              <Link href={`/careers/${j.slug}`} className="btn-primary btn-sm mt-auto self-start">Apply</Link>
            </article>
          ))}
        </div>
        {!jobs.length && <p className="text-subtle">No open roles match those filters right now.</p>}
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <span><b className="text-ink">No matching role?</b> <span className="text-subtle">We read every general application.</span></span>
          <Link href="/careers/apply" className="btn-secondary">Send a general application</Link>
        </div>
      </section>
      <ClosingCta />
    </>
  );
}

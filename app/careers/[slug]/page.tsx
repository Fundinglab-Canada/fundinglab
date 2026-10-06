import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BRAND, jobTypeLabel } from "@/lib/constants";
import { dateShort } from "@/lib/format";
import { ApplicationForm } from "../application-form";
import { Turnstile } from "@/components/turnstile";

type Job = {
  id: string; title: string; slug: string; department: string; job_type: string; location: string; remote_option: string; compensation_text: string | null;
  description: string; responsibilities: string[]; requirements: string[]; nice_to_have: string[]; posted_at: string | null; closes_at: string | null;
};

async function getJob(slug: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("jobs").select("*").eq("slug", slug).eq("status", "open").maybeSingle();
    return data as Job | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const job = await getJob((await params).slug);
  return job ? { title: `${job.title} — Careers`, description: job.description.slice(0, 160) } : {};
}

const EMPLOYMENT: Record<string, string> = { full_time: "FULL_TIME", part_time: "PART_TIME", contract: "CONTRACTOR", internship: "INTERN", volunteer: "VOLUNTEER", ambassador: "OTHER" };

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const job = await getJob((await params).slug);
  if (!job) notFound();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fundinglab.ca";
  const jsonLd = {
    "@context": "https://schema.org", "@type": "JobPosting", title: job.title, description: job.description,
    datePosted: job.posted_at, validThrough: job.closes_at ?? undefined, employmentType: EMPLOYMENT[job.job_type],
    hiringOrganization: { "@type": "Organization", name: BRAND.name, sameAs: site },
    ...(job.remote_option === "remote"
      ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "Canada" } }
      : { jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location, addressCountry: "CA" } } }),
  };
  return (
    <section className="container grid items-start gap-10 py-12 lg:grid-cols-[1.1fr_.9fr]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="flex flex-col gap-4">
        <Link href="/careers" className="text-sm text-subtle hover:underline">← All roles</Link>
        <h1 className="text-4xl font-extrabold">{job.title}</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="pill">{job.department}</span><span className="pill">{jobTypeLabel(job.job_type)}</span>
          <span className="pill">{job.location} · {job.remote_option}</span>
          {job.compensation_text && <span className="pill">{job.compensation_text}</span>}
        </div>
        <p className="text-sm text-subtle">Posted {dateShort(job.posted_at)}{job.closes_at ? ` · Closes ${dateShort(job.closes_at)}` : ""}</p>
        <div className="prose-fl">
          <h2>About the role</h2><p>{job.description}</p>
          {job.responsibilities.length > 0 && <><h2>Responsibilities</h2><ul>{job.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul></>}
          {job.requirements.length > 0 && <><h2>Requirements</h2><ul>{job.requirements.map((r) => <li key={r}>{r}</li>)}</ul></>}
          {job.nice_to_have.length > 0 && <><h2>Nice to have</h2><ul>{job.nice_to_have.map((r) => <li key={r}>{r}</li>)}</ul></>}
        </div>
      </article>
      <div id="apply" className="lg:sticky lg:top-24"><ApplicationForm jobId={job.id} jobTitle={job.title} turnstile={<Turnstile />} /></div>
    </section>
  );
}

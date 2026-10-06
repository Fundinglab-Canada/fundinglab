import { ApplicationForm } from "../application-form";
import { Turnstile } from "@/components/turnstile";

export const metadata = { title: "General application — Careers" };

export default function GeneralApplicationPage() {
  return (
    <section className="container flex max-w-2xl flex-col gap-4 py-12">
      <span className="eyebrow">Careers</span>
      <h1 className="text-3xl font-extrabold">Send a general application</h1>
      <p className="text-subtle">Employees, contractors, interns, volunteers and ambassadors are all welcome.</p>
      <ApplicationForm jobId={null} jobTitle="General application" turnstile={<Turnstile />} />
    </section>
  );
}

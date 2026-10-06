"use client";

import { useActionState } from "react";
import { PROVINCES } from "@/lib/constants";
import { submitApplication } from "./actions";

export function ApplicationForm({ jobId, jobTitle, turnstile }: { jobId: string | null; jobTitle: string; turnstile: React.ReactNode }) {
  const [state, action, pending] = useActionState(submitApplication, undefined);
  if (state?.ok) {
    return (
      <div className="card" role="status">
        <h2 className="text-xl font-bold">Application received</h2>
        <p className="text-body">Thank you for applying. We&apos;ve emailed you a confirmation and will be in touch if there&apos;s a fit.</p>
      </div>
    );
  }
  return (
    <form action={action} className="card grid gap-3 sm:grid-cols-2" encType="multipart/form-data">
      <h2 className="text-xl font-bold sm:col-span-2">Apply: {jobTitle}</h2>
      {state?.error && <p className="error rounded-md bg-danger-soft px-3 py-2 sm:col-span-2" role="alert">{state.error}</p>}
      <input type="hidden" name="job_id" value={jobId ?? ""} />
      <label className="field">Full name<input name="full_name" required autoComplete="name" className="input" /></label>
      <label className="field">Email<input name="email" type="email" required autoComplete="email" className="input" /></label>
      <label className="field">Phone<input name="phone" type="tel" autoComplete="tel" className="input" /></label>
      <label className="field">City<input name="city" autoComplete="address-level2" className="input" /></label>
      <label className="field">Province<select name="province" className="input" defaultValue="BC">{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></label>
      <label className="field">LinkedIn URL<input name="linkedin_url" type="url" className="input" placeholder="https://www.linkedin.com/in/…" /></label>
      <label className="field sm:col-span-2">Portfolio or website (optional)<input name="portfolio_url" type="url" className="input" /></label>
      <label className="field sm:col-span-2">Resume (PDF or DOCX, max 10 MB)<input name="resume" type="file" required accept=".pdf,.doc,.docx" className="text-sm" /></label>
      <label className="field sm:col-span-2">Cover letter (optional, file)<input name="cover_letter" type="file" accept=".pdf,.doc,.docx" className="text-sm" /></label>
      <label className="field sm:col-span-2">…or paste a cover letter<textarea name="cover_letter_text" rows={3} maxLength={5000} className="input" /></label>
      <label className="field sm:col-span-2">Why Funding Lab?<textarea name="why_us" rows={4} maxLength={1000} className="input" /><span className="help">Up to 1,000 characters.</span></label>
      <label className="field">Available to start<input name="start_date" type="date" className="input" /></label>
      <label className="field">Preferred work type
        <select name="work_type" className="input"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship / Co-op</option><option>Volunteer</option><option>Ambassador</option></select>
      </label>
      <fieldset className="field sm:col-span-2">
        <legend className="mb-1">Are you legally entitled to work in Canada?</legend>
        <div className="flex gap-4 font-normal"><label className="flex items-center gap-2"><input type="radio" name="work_eligible" value="yes" required />Yes</label><label className="flex items-center gap-2"><input type="radio" name="work_eligible" value="no" />No</label></div>
      </fieldset>
      <label className="field sm:col-span-2">How did you hear about us?<input name="source" className="input" /></label>
      <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="consent" required className="mt-1" />I agree to Funding Lab storing my application for recruitment purposes for up to 12 months.</label>
      <div className="sm:col-span-2">{turnstile}</div>
      <button className="btn-primary self-start" disabled={pending}>{pending ? "Submitting…" : "Submit application"}</button>
    </form>
  );
}

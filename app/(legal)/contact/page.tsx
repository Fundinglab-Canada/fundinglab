import { BRAND } from "@/lib/constants";
import { sendContact } from "./actions";

export const metadata = { title: "Contact" };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  return (
    <section className="container grid gap-10 py-14 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <span className="eyebrow">Contact</span>
        <h1 className="text-4xl font-extrabold">Talk to Funding Lab</h1>
        <p className="text-subtle">Questions about the platform, partnerships or services.</p>
        <div className="card flex flex-col gap-1">
          <b className="text-ink">Pankaj Bagga</b>
          <span className="num">+1 604 360 7088</span>
          <span className="text-sm text-subtle">Metro Vancouver, BC</span>
        </div>
        <p className="text-xs text-subtle">{BRAND.disclaimer}</p>
      </div>
      <form action={sendContact} className="card flex flex-col gap-3">
        {sent && <p className="pill-success px-4 py-2 text-sm">Message sent. We reply within one business day.</p>}
        <label className="field">Name<input name="name" required maxLength={120} className="input" autoComplete="name" /></label>
        <label className="field">Email<input name="email" type="email" required className="input" autoComplete="email" /></label>
        <label className="field">Message<textarea name="message" required maxLength={4000} rows={6} className="input" /></label>
        <input name="company_website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
        <button className="btn-primary">Send message</button>
      </form>
    </section>
  );
}

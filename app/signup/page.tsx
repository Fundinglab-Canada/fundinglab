import Link from "next/link";
import { signUp } from "@/app/login/actions";
import { AuthProviders, OrDivider } from "@/components/auth-providers";
import { CTA } from "@/lib/constants";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Create your free account", description: "Free account: see the funding you qualify for, your readiness score and private introductions." };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; role?: string; stage?: string; name?: string; error?: string; sent?: string; email?: string }> }) {
  const sp = await searchParams;
  const role = sp.role === "partner" ? "partner" : "business";
  const onboarding = `/onboarding?${new URLSearchParams({ next: safeNext(sp.next), ...(sp.stage ? { stage: sp.stage } : {}), role }).toString()}`;
  if (sp.sent) {
    return (
      <section className="container flex justify-center py-16">
        <div className="card flex w-full max-w-md flex-col gap-3" role="status">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-body">We sent a confirmation link to <b className="text-ink">{sp.email}</b>. Click it to finish creating your account.</p>
        </div>
      </section>
    );
  }
  return (
    <section className="container flex justify-center py-16">
      <div className="card flex w-full max-w-md flex-col gap-5">
        <div>
          <span className="eyebrow">{role === "partner" ? "Partner account" : "Free account"}</span>
          <h1 className="mt-2 text-2xl font-bold">{role === "partner" ? "Create your partner account" : "Find the funding you qualify for"}</h1>
          <p className="mt-1 text-sm text-subtle">{CTA.trust}</p>
        </div>
        {sp.error && <p className="error rounded-md bg-danger-soft px-3 py-2" role="alert">{sp.error}</p>}
        <AuthProviders next={onboarding} verb="Sign up" />
        <OrDivider />
        <form action={signUp} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={onboarding} />
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="stage" value={sp.stage ?? ""} />
          <label className="field">Your name<input name="full_name" required defaultValue={sp.name ?? ""} autoComplete="name" className="input" /></label>
          <label className="field">Email<input name="email" type="email" required autoComplete="email" className="input" /></label>
          <label className="field">Password<input name="password" type="password" required minLength={10} autoComplete="new-password" className="input" /><span className="help">At least 10 characters.</span></label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="terms" required className="mt-1" />I agree to the <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy Policy</a>.</label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="marketing" className="mt-1" />Send me funding news and program deadlines (optional).</label>
          <button className="btn-cta">{role === "partner" ? "Create account" : CTA.label}</button>
        </form>
        <p className="text-sm text-subtle">Already have an account? <Link href={`/login?next=${encodeURIComponent(safeNext(sp.next))}`} className="font-semibold text-brand-text underline">Log in</Link></p>
      </div>
    </section>
  );
}

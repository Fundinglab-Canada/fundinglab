import Link from "next/link";
import { signInWithEmail, signInWithPassword } from "./actions";
import { AuthProviders, OrDivider } from "@/components/auth-providers";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; sent?: string; error?: string; role?: string; mode?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const magic = sp.mode === "link";
  return (
    <section className="container flex justify-center py-16">
      <div className="card flex w-full max-w-md flex-col gap-5">
        <div>
          <span className="eyebrow">{sp.role === "partner" ? "Partner log in" : "Log in"}</span>
          <h1 className="mt-2 text-2xl font-bold">Welcome back</h1>
        </div>
        {sp.sent && <p className="pill-success px-4 py-2 text-sm" role="status">Check your email for a sign-in link.</p>}
        {sp.error && <p className="error rounded-md bg-danger-soft px-3 py-2" role="alert">{sp.error}</p>}
        <AuthProviders next={next} />
        <OrDivider />
        {magic ? (
          <form action={signInWithEmail} className="flex flex-col gap-3">
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="role" value={sp.role === "partner" ? "partner" : "business"} />
            <label className="field">Email<input name="email" type="email" required autoComplete="email" className="input" /></label>
            <button className="btn-primary">Email me a sign-in link</button>
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-sm text-subtle underline">Use a password instead</Link>
          </form>
        ) : (
          <form action={signInWithPassword} className="flex flex-col gap-3">
            <input type="hidden" name="next" value={next} />
            <label className="field">Email<input name="email" type="email" required autoComplete="email" className="input" /></label>
            <label className="field">Password<input name="password" type="password" required autoComplete="current-password" className="input" /></label>
            <button className="btn-primary">Log in</button>
            <div className="flex justify-between text-sm">
              <Link href="/forgot-password" className="text-subtle underline">Forgot password?</Link>
              <Link href={`/login?mode=link&next=${encodeURIComponent(next)}`} className="text-subtle underline">Email me a link</Link>
            </div>
          </form>
        )}
        <p className="text-sm text-subtle">New to Funding Lab? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-text underline">Create a free account</Link></p>
      </div>
    </section>
  );
}

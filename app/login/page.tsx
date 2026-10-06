import { signInWithEmail, signInWithProvider } from "./actions";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; sent?: string; error?: string; role?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") ? sp.next : "/dashboard";
  return (
    <section className="container flex justify-center py-16">
      <div className="card flex w-full max-w-md flex-col gap-5">
        <div>
          <span className="eyebrow">{sp.role === "partner" ? "Partner sign in" : "Sign in or create an account"}</span>
          <h1 className="mt-2 text-2xl font-bold">Welcome to Funding Lab</h1>
          <p className="mt-1 text-sm text-subtle">Your profile is private by default. Nothing is shared without your consent.</p>
        </div>

        {sp.sent && <p className="pill-success px-4 py-2 text-sm">Check your email for a sign-in link.</p>}
        {sp.error && <p className="error" role="alert">{sp.error}</p>}

        <form action={signInWithProvider} className="flex flex-col gap-2">
          <input type="hidden" name="next" value={next} />
          <button name="provider" value="google" className="btn-secondary">Continue with Google</button>
          <button name="provider" value="linkedin_oidc" className="btn-secondary">Continue with LinkedIn</button>
        </form>

        <div className="flex items-center gap-3 text-xs text-subtle"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>

        <form action={signInWithEmail} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="role" value={sp.role === "partner" ? "partner" : "business"} />
          <label className="field">Work email
            <input name="email" type="email" required autoComplete="email" className="input" />
          </label>
          <button className="btn-primary">Email me a sign-in link</button>
        </form>
        <p className="text-xs text-subtle">
          By continuing you agree to the <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy Policy</a>.
        </p>
      </div>
    </section>
  );
}

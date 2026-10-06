import { requestPasswordReset } from "@/app/login/actions";

export const metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <section className="container flex justify-center py-16">
      <form action={requestPasswordReset} className="card flex w-full max-w-md flex-col gap-4">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        {sp.sent ? (
          <p className="pill-success px-4 py-2 text-sm" role="status">If an account exists for that email, we&apos;ve sent a reset link.</p>
        ) : (
          <>
            {sp.error && <p className="error" role="alert">{sp.error}</p>}
            <label className="field">Email<input name="email" type="email" required autoComplete="email" className="input" /></label>
            <button className="btn-primary self-start">Send reset link</button>
          </>
        )}
      </form>
    </section>
  );
}

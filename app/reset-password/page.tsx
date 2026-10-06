import { updatePassword } from "@/app/login/actions";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser("/reset-password");
  const sp = await searchParams;
  return (
    <section className="container flex justify-center py-16">
      <form action={updatePassword} className="card flex w-full max-w-md flex-col gap-4">
        <h1 className="text-2xl font-bold">Choose a new password</h1>
        {sp.error && <p className="error" role="alert">{sp.error}</p>}
        <label className="field">New password<input name="password" type="password" required minLength={10} autoComplete="new-password" className="input" /></label>
        <label className="field">Confirm password<input name="confirm" type="password" required minLength={10} autoComplete="new-password" className="input" /></label>
        <button className="btn-primary self-start">Save password</button>
      </form>
    </section>
  );
}

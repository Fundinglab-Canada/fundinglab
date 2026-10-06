import { signInWithProvider } from "@/app/login/actions";

export function AuthProviders({ next, verb = "Continue" }: { next: string; verb?: string }) {
  return (
    <form action={signInWithProvider} className="flex flex-col gap-2">
      <input type="hidden" name="next" value={next} />
      <button name="provider" value="google" className="btn-secondary">{verb} with Google</button>
      <button name="provider" value="linkedin_oidc" className="btn-secondary">{verb} with LinkedIn</button>
    </form>
  );
}

export const OrDivider = () => (
  <div className="flex items-center gap-3 text-xs text-subtle"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
);

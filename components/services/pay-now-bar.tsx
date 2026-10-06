import Link from "next/link";

/** "Pay now" strip at the top of service pages, for clients who already have a quote from the Funding Lab Team. */
export function PayNowBar({ signedIn }: { signedIn: boolean }) {
  const href = signedIn ? "/app/services#pay" : `/login?next=${encodeURIComponent("/app/services#pay")}`;
  return (
    <div className="border-b border-line bg-brand-soft">
      <div className="container flex flex-col items-start gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-ink"><b>Already have a quote from us?</b> Pay securely online.</span>
        <Link href={href} className="btn-primary btn-sm">Pay now</Link>
      </div>
    </div>
  );
}

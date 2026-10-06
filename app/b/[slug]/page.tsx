import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { InvestorSnapshot, type SnapshotData } from "@/components/snapshot";
import { PrintButton } from "@/components/print-button";
import { unlockShare } from "./actions";

export const metadata = { title: "Investor snapshot", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type OpenResult =
  | { status: "ok"; snapshot: SnapshotData }
  | { status: "password_required"; label?: string }
  | { status: "invalid" }
  | { status: "expired" };

export default async function SharedSnapshot({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ s?: string; tried?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  if (!sp.s) return <Message title="This link is incomplete" body="Ask the business for a new share link." />;

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ipHash = ip ? createHash("sha256").update(`${env.shareIpSalt()}:${ip}`).digest("hex").slice(0, 32) : null;

  const jar = await cookies();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fl_open_share", {
    p_slug: slug,
    p_token: sp.s,
    p_password: jar.get(`fl_share_pw_${sp.s}`)?.value ?? null,
    p_viewer_email: jar.get(`fl_share_email_${sp.s}`)?.value ?? null,
    p_ip_hash: ipHash,
    p_user_agent: h.get("user-agent"),
    p_referrer: h.get("referer"),
  });
  const result = (error ? { status: "invalid" } : data) as OpenResult;

  if (result.status === "invalid") return <Message title="This link isn't available" body="It may have been revoked, or the profile is no longer shared." />;
  if (result.status === "expired") return <Message title="This link has expired" body="Ask the business for a new share link." />;
  if (result.status === "password_required") {
    return (
      <section className="container flex justify-center py-16">
        <form action={unlockShare} className="card flex w-full max-w-sm flex-col gap-3">
          <h1 className="text-xl font-bold">Enter the password</h1>
          <p className="text-sm text-subtle">This investor snapshot is password-protected.</p>
          <input type="hidden" name="s" value={sp.s} />
          <input type="hidden" name="slug" value={slug} />
          {sp.tried && <p className="error" role="alert">That password didn&apos;t match. Try again.</p>}
          <label className="field">Password<input name="pw" type="password" required className="input" autoComplete="off" /></label>
          <label className="field">Your email (optional)<input name="email" type="email" className="input" /><span className="help">Lets the business know who viewed it.</span></label>
          <button className="btn-primary">View snapshot</button>
        </form>
      </section>
    );
  }
  return (
    <section className="container flex flex-col gap-4 py-10">
      <InvestorSnapshot s={result.snapshot} />
      <div className="no-print flex justify-center"><PrintButton /></div>
    </section>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <section className="container flex justify-center py-20">
      <div className="card max-w-md text-center"><h1 className="text-xl font-bold">{title}</h1><p className="mt-2 text-subtle">{body}</p></div>
    </section>
  );
}

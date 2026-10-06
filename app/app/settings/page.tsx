import { getMyBusiness, requireUser } from "@/lib/auth";
import { CONSENT } from "@/lib/constants";
import { deleteAccount, saveSettings } from "./actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { profile } = await requireUser("/app/settings");
  const sp = await searchParams;
  const business = await getMyBusiness();
  return (
    <section className="container flex max-w-3xl flex-col gap-6 py-10">
      <h1 className="text-3xl font-bold">Settings</h1>
      {sp.saved && <p className="pill-success self-start px-4 py-2 text-sm" role="status">Saved.</p>}
      {sp.error && <p className="error rounded-md bg-danger-soft px-3 py-2" role="alert">{sp.error}</p>}

      <form action={saveSettings} className="card flex flex-col gap-4">
        <h2 className="text-lg font-bold">Account and consent</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field">Name<input name="full_name" defaultValue={profile.full_name ?? ""} className="input" /></label>
          <label className="field">Email<input value={profile.email ?? ""} disabled className="input opacity-70" /></label>
          <label className="field">Mobile (for SMS reminders)<input name="phone" type="tel" defaultValue={profile.phone ?? ""} className="input" /></label>
        </div>
        {business && (
          <>
            <label className="flex items-start gap-3"><input type="checkbox" name="matching" defaultChecked={business.consent_matching} className="mt-1" />{CONSENT.matching}</label>
            <label className="flex items-start gap-3"><input type="checkbox" name="sharing" defaultChecked={business.consent_sharing} className="mt-1" />{CONSENT.sharing}</label>
          </>
        )}
        <label className="flex items-start gap-3"><input type="checkbox" name="marketing" defaultChecked={profile.marketing_opt_in} className="mt-1" />{CONSENT.marketing}</label>
        <label className="flex items-start gap-3"><input type="checkbox" name="sms" defaultChecked={profile.sms_opt_in} className="mt-1" />Text me webinar and deadline reminders. Reply STOP anytime.</label>
        <p className="help">Every change is recorded with a timestamp. Withdrawing matching consent stops new introductions.</p>
        <button className="btn-primary self-start">Save settings</button>
      </form>

      <div className="card flex flex-col gap-3">
        <h2 className="text-lg font-bold">Your data</h2>
        <p className="text-sm text-body">Download everything we hold about you and your business as a JSON file.</p>
        <a href="/api/me/export" className="btn-secondary self-start" download>Download my data</a>
      </div>

      <form action={deleteAccount} className="card flex flex-col gap-3 border-danger/40">
        <h2 className="text-lg font-bold text-danger">Delete account</h2>
        <p className="text-sm text-body">Permanently deletes your account, business profile, uploaded documents, funding history and introductions. This can&apos;t be undone.</p>
        <label className="field">Type DELETE to confirm<input name="confirm" required pattern="DELETE" autoComplete="off" className="input" /></label>
        <button className="btn-secondary self-start border-danger text-danger">Delete my account</button>
      </form>
    </section>
  );
}

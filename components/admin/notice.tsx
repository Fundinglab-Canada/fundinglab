/** Shows ?saved / ?error feedback from admin forms. */
export function AdminNotice({ sp }: { sp: { saved?: string; error?: string } }) {
  if (sp.error) return <p className="error rounded-md bg-danger-soft px-3 py-2" role="alert">{sp.error}</p>;
  if (sp.saved) return <p className="pill-success self-start px-3 py-1.5 text-sm" role="status">Saved.</p>;
  return null;
}

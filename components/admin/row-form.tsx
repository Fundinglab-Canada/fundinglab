import { ADMIN_TABLES, type AdminTable, type Field } from "@/lib/admin/tables";
import { adminDeleteRow, adminSaveRow } from "@/lib/admin/crud";

const toLocal = (v: unknown) => {
  if (!v) return "";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "";
  // Show Pacific wall-clock time in the datetime-local input.
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Vancouver", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
};

/** Generic admin editor for a whitelisted table row. Datetimes are entered in Pacific time. */
export function RowForm({ table, row, back, deletable = true, extra }: { table: AdminTable; row?: Record<string, unknown> | null; back: string; deletable?: boolean; extra?: React.ReactNode }) {
  const spec = ADMIN_TABLES[table];
  const id = row?.id ? String(row.id) : "";
  return (
    <form action={adminSaveRow} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="_table" value={table} />
      <input type="hidden" name="_id" value={id} />
      <input type="hidden" name="_back" value={back} />
      <input type="hidden" name="_tz" value="America/Vancouver" />
      {(spec.fields as readonly Field[]).map((f) => {
        const v = row?.[f.name];
        const cls = `field ${f.wide || f.type === "textarea" || f.type === "json" || f.type === "lines" ? "sm:col-span-2" : ""}`;
        if (f.type === "bool") {
          return <label key={f.name} className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" name={f.name} defaultChecked={!!v} />{f.label}</label>;
        }
        return (
          <label key={f.name} className={cls}>
            {f.label}{f.required ? " *" : ""}
            {f.type === "select" ? (
              <select name={f.name} defaultValue={String(v ?? f.options?.[0] ?? "")} className="input">{f.options!.map((o) => <option key={o} value={o}>{o || "—"}</option>)}</select>
            ) : f.type === "textarea" || f.type === "lines" || f.type === "json" ? (
              <textarea name={f.name} rows={f.type === "json" ? 16 : 4} className={`input ${f.type === "json" ? "font-mono text-[13px]" : ""}`}
                defaultValue={f.type === "lines" ? (Array.isArray(v) ? v.join("\n") : "") : f.type === "json" ? JSON.stringify(v ?? {}, null, 2) : String(v ?? "")} />
            ) : (
              <input name={f.name} className="input"
                type={f.type === "datetime" ? "datetime-local" : f.type === "date" ? "date" : f.type === "int" || f.type === "money" ? "number" : f.type === "url" ? "url" : "text"}
                step={f.type === "money" ? "0.01" : undefined}
                defaultValue={f.type === "datetime" ? toLocal(v) : f.type === "date" ? String(v ?? "").slice(0, 10) : String(v ?? "")} />
            )}
            {f.help && <span className="help">{f.help}</span>}
          </label>
        );
      })}
      {extra}
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primary btn-sm">{id ? "Save" : `Add ${spec.label.toLowerCase()}`}</button>
        {id && deletable && (
          <button formAction={adminDeleteRow} className="btn-ghost btn-sm text-danger" formNoValidate>Delete</button>
        )}
      </div>
    </form>
  );
}

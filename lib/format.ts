export function money(n: number | string | null | undefined, compact = false): string {
  const v = Number(n ?? 0);
  if (compact && Math.abs(v) >= 1_000_000) return `$${trim(v / 1_000_000)}M`;
  if (compact && Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v.toLocaleString("en-CA", { maximumFractionDigits: 0 })}`;
}
function trim(v: number) {
  return v.toFixed(2).replace(/\.?0+$/, "");
}

export function dateShort(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T12:00:00` : d) : d;
  return date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? "");
          // Neutralise spreadsheet formula injection.
          const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
          return `"${safe.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}

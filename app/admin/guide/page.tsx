import fs from "node:fs";
import path from "node:path";

export const metadata = { title: "Admin guide" };

/** Renders docs/admin-guide.md (headings, lists, paragraphs, **bold**, `code`). The markdown file is the single source. */
function inline(s: string) {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : p.startsWith("`") ? <code key={i} className="rounded bg-muted px-1 text-[13px]">{p.slice(1, -1)}</code> : p.startsWith("*") && p.length > 2 ? <em key={i}>{p.slice(1, -1)}</em> : p,
  );
}

export default function AdminGuidePage() {
  const md = fs.readFileSync(path.join(process.cwd(), "docs", "admin-guide.md"), "utf8");
  const blocks = md.split(/\n\s*\n/);
  return (
    <article className="prose-fl card max-w-3xl">
      {blocks.map((b, i) => {
        const lines = b.trim().split("\n");
        if (lines[0].startsWith("# ")) return <h1 key={i}>{inline(lines[0].slice(2))}</h1>;
        if (lines[0].startsWith("## ")) return <h2 key={i}>{inline(lines[0].slice(3))}</h2>;
        if (lines.every((l) => /^(- |\d+\. )/.test(l))) {
          const ordered = /^\d+\. /.test(lines[0]);
          const items = lines.map((l, j) => <li key={j}>{inline(l.replace(/^(- |\d+\. )/, ""))}</li>);
          return ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>;
        }
        return <p key={i}>{inline(lines.join(" "))}</p>;
      })}
    </article>
  );
}

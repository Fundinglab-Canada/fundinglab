import { zonedTime } from "@/lib/time";
// Field specs for admin-editable tables. Shared by the generic row form (UI) and the save action (validation),
// so only whitelisted tables and columns can ever be written from /admin.

export type FieldType = "text" | "textarea" | "int" | "money" | "bool" | "datetime" | "date" | "lines" | "json" | "select" | "url";
export type Field = { name: string; label: string; type: FieldType; options?: readonly string[]; required?: boolean; help?: string; wide?: boolean };

export const ADMIN_TABLES = {
  team_members: {
    label: "Team member",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "member_group", label: "Group", type: "select", options: ["founder", "advisor", "team"], required: true },
      { name: "bio", label: "Bio", type: "textarea", wide: true, help: "Leave as “[Bio to be added]” until a real bio is supplied. Never invent biographies." },
      { name: "photo_url", label: "Photo URL", type: "url" },
      { name: "linkedin_url", label: "LinkedIn URL", type: "url" },
      { name: "sort_order", label: "Order", type: "int" },
      { name: "published", label: "Published", type: "bool" },
    ],
  },
  partner_logos: {
    label: "Partner logo",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "logo_url", label: "Logo URL", type: "url" },
      { name: "website", label: "Website", type: "url" },
      { name: "sort_order", label: "Order", type: "int" },
      { name: "published", label: "Published (only with written permission)", type: "bool" },
    ],
  },
  testimonials: {
    label: "Testimonial",
    fields: [
      { name: "quote", label: "Quote", type: "textarea", required: true, wide: true },
      { name: "attribution", label: "Attribution", type: "text", required: true, help: "Name, role and business, e.g. “Priya S., Founder, Maple Pantry Foods”" },
      { name: "photo_url", label: "Photo or avatar URL", type: "url", help: "Client photo, or an AI-generated avatar if the client prefers not to show a photo." },
      { name: "sort_order", label: "Order", type: "int" },
      { name: "consent_on_file", label: "Written consent on file", type: "bool" },
      { name: "published", label: "Published", type: "bool" },
    ],
  },
  announcements: {
    label: "Announcement",
    fields: [
      { name: "message", label: "Message", type: "text", required: true, wide: true },
      { name: "href", label: "Link", type: "text" },
      { name: "starts_at", label: "Starts", type: "datetime" },
      { name: "ends_at", label: "Ends", type: "datetime" },
      { name: "sort_order", label: "Order", type: "int" },
      { name: "active", label: "Active", type: "bool" },
    ],
  },
  jobs: {
    label: "Job",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true, help: "Lowercase, hyphens. Used in the URL." },
      { name: "department", label: "Department", type: "text", required: true },
      { name: "job_type", label: "Type", type: "select", options: ["full_time", "part_time", "contract", "internship", "volunteer", "ambassador"], required: true },
      { name: "location", label: "Location", type: "text", required: true },
      { name: "remote_option", label: "Remote", type: "select", options: ["remote", "hybrid", "onsite"], required: true },
      { name: "compensation_text", label: "Compensation", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["draft", "open", "closed"], required: true },
      { name: "posted_at", label: "Posted", type: "datetime" },
      { name: "closes_at", label: "Closes", type: "datetime" },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "responsibilities", label: "Responsibilities (one per line)", type: "lines", wide: true },
      { name: "requirements", label: "Requirements (one per line)", type: "lines", wide: true },
      { name: "nice_to_have", label: "Nice to have (one per line)", type: "lines", wide: true },
    ],
  },
  webinar_sessions: {
    label: "Webinar session",
    fields: [
      { name: "starts_at", label: "Starts", type: "datetime", required: true },
      { name: "duration_minutes", label: "Minutes", type: "int" },
      { name: "topic", label: "Topic", type: "text", required: true, wide: true },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "join_url", label: "Join URL (emailed to registrants only)", type: "url" },
      { name: "replay_url", label: "Replay URL (members only)", type: "url" },
      { name: "status", label: "Status", type: "select", options: ["scheduled", "live", "completed", "cancelled"], required: true },
      { name: "capacity", label: "Capacity", type: "int" },
    ],
  },
  cohorts: {
    label: "Cohort",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "start_date", label: "Start date (a Friday)", type: "date", required: true },
      { name: "price_cad", label: "Price (CAD)", type: "money" },
      { name: "stripe_price_id", label: "Stripe price ID (optional)", type: "text" },
      { name: "capacity", label: "Capacity", type: "int" },
      { name: "registration_deadline", label: "Registration deadline", type: "date" },
      { name: "join_url", label: "Join URL", type: "url" },
      { name: "status", label: "Status", type: "select", options: ["draft", "open", "full", "in_progress", "completed"], required: true },
    ],
  },
  programs: {
    label: "Program",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "funder", label: "Funder", type: "text", required: true },
      { name: "level", label: "Level", type: "select", options: ["federal", "provincial", "regional", "municipal"], required: true },
      { name: "province", label: "Province", type: "text" },
      { name: "type", label: "Type", type: "select", options: ["grant", "contribution", "loan", "tax_credit", "wage_subsidy", "equity", "repayable"], required: true },
      { name: "summary", label: "Summary", type: "textarea", wide: true },
      { name: "min_amount", label: "Min amount", type: "money" },
      { name: "max_amount", label: "Max amount", type: "money" },
      { name: "cost_share_pct", label: "Cost share %", type: "money" },
      { name: "intake_close", label: "Intake closes", type: "datetime" },
      { name: "rolling", label: "Rolling intake", type: "bool" },
      { name: "official_url", label: "Official URL", type: "url", wide: true },
      { name: "last_verified_at", label: "Last verified", type: "date" },
      { name: "verified_by", label: "Verified by", type: "text" },
      { name: "active", label: "Active", type: "bool" },
      { name: "is_sample", label: "Sample (placeholder) program", type: "bool" },
      { name: "is_featured", label: "Featured", type: "bool" },
      { name: "featured_order", label: "Featured order", type: "int" },
      { name: "badge", label: "Badge", type: "text" },
      { name: "headline", label: "Headline", type: "text", wide: true },
      { name: "subheadline", label: "Subheadline", type: "textarea", wide: true },
      { name: "status_text", label: "Status text", type: "text" },
      { name: "close_at", label: "Featured deadline", type: "datetime" },
      { name: "calculator", label: "Calculator", type: "select", options: ["", "redip", "rtri"] },
      { name: "official_contact", label: "Official contact", type: "text", wide: true },
      { name: "disclaimer", label: "Disclaimer", type: "textarea", wide: true },
      { name: "content", label: "Page content blocks (JSON)", type: "json", wide: true, help: "Each key is a page section. Keep the structure; edit the text." },
    ],
  },
} as const satisfies Record<string, { label: string; fields: readonly Field[] }>;

export type AdminTable = keyof typeof ADMIN_TABLES;

/** Converts a form submission into a row for the given table. Throws a readable error on bad input. */
export function parseRow(table: AdminTable, form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of ADMIN_TABLES[table].fields as readonly Field[]) {
    const raw = form.get(f.name);
    const s = typeof raw === "string" ? raw.trim() : "";
    if (f.type === "bool") { out[f.name] = raw === "on"; continue; }
    if (!s) {
      if (f.required) throw new Error(`${f.label} is required.`);
      out[f.name] = f.type === "lines" ? [] : f.type === "json" ? {} : null;
      continue;
    }
    switch (f.type) {
      case "int": {
        const n = Number(s);
        if (!Number.isInteger(n)) throw new Error(`${f.label} must be a whole number.`);
        out[f.name] = n;
        break;
      }
      case "money": {
        const n = Number(s);
        if (!Number.isFinite(n)) throw new Error(`${f.label} must be a number.`);
        out[f.name] = n;
        break;
      }
      case "datetime":
      case "date": {
        if (Number.isNaN(Date.parse(s))) throw new Error(`${f.label} isn't a valid date.`);
        // datetime-local inputs carry no zone: they are entered in Pacific time.
        out[f.name] = f.type === "date" ? s.slice(0, 10) : /[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? new Date(s).toISOString() : zonedTime(s, "America/Vancouver").toISOString();
        break;
      }
      case "lines":
        out[f.name] = s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
        break;
      case "json":
        try { out[f.name] = JSON.parse(s); } catch { throw new Error(`${f.label} isn't valid JSON.`); }
        break;
      case "select":
        if (f.options && !f.options.includes(s)) throw new Error(`Choose a valid ${f.label.toLowerCase()}.`);
        out[f.name] = s;
        break;
      case "url":
        if (!/^https?:\/\//i.test(s)) throw new Error(`${f.label} must start with https://`);
        out[f.name] = s.slice(0, 500);
        break;
      default:
        out[f.name] = s.slice(0, f.type === "textarea" ? 10000 : 500);
    }
  }
  return out;
}

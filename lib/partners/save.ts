import "server-only";
import { partnerApplicationSchema } from "@/lib/validation";
import { amountRange, parseDetails } from "./fields";
import type { PartnerTypeId } from "@/lib/constants";

/** Parses the shared partner form into partner + criteria rows. */
export function parsePartnerForm(formData: FormData, requireTerms: boolean) {
  const raw: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("d_")) {
      const all = formData.getAll(key);
      raw[key.slice(2)] = all.length > 1 ? all : all[0];
    }
  }
  const type = String(formData.get("type")) as PartnerTypeId;
  let details: Record<string, unknown> = {};
  try {
    details = parseDetails(type, raw);
  } catch {
    details = {};
  }
  const range = amountRange(details);
  const parsed = partnerApplicationSchema.safeParse({
    type,
    display_name: formData.get("display_name"),
    company: formData.get("company") ?? undefined,
    contact_person: formData.get("contact_person"),
    contact_email: formData.get("contact_email"),
    contact_phone: formData.get("contact_phone") ?? undefined,
    location: formData.get("location"),
    bio: formData.get("bio") ?? undefined,
    linkedin_url: formData.get("linkedin_url") ?? "",
    stages: formData.getAll("stages"),
    industries: formData.getAll("industries"),
    provinces: formData.getAll("provinces"),
    min_amount: range.min,
    max_amount: range.max,
    details,
    agree: requireTerms ? formData.get("agree") === "on" : true,
  });
  if (requireTerms && formData.get("confidential") !== "on") return { error: "Confirm the confidentiality commitment to continue." } as const;
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." } as const;
  const p = parsed.data;
  return {
    partner: {
      type: p.type, display_name: p.display_name, company: p.company, contact_person: p.contact_person,
      contact_email: p.contact_email, contact_phone: p.contact_phone, location: p.location, bio: p.bio ?? null,
      linkedin_url: p.linkedin_url || null, details: p.details,
    },
    criteria: {
      stages: p.stages, industries: p.industries, provinces: p.provinces,
      min_amount: p.min_amount ?? null, max_amount: p.max_amount ?? null,
      // Service partners solve specific needs; this seeds the use-of-funds signal for matching.
      uses_of_funds: p.type === "commercial_lawyer" ? ["ip_patent", "partner_buyout"]
        : p.type === "grant_writer" ? ["hire_staff", "rd"]
        : p.type === "fractional_cpa" ? ["rd"]
        : p.type === "marketing_expert" ? ["marketing"]
        : p.type === "development_expert" ? ["product_development"]
        : p.type === "ma_expert" ? ["partner_buyout"]
        : p.type === "recruiter" ? ["hire_staff"] : [],
    },
  } as const;
}

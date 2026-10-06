import { z } from "zod";
import { FUNDING_SOURCES, FUNDING_STATUSES, INDUSTRIES, LEGAL_STRUCTURES, LOAN_SUBTYPES, OWNERSHIP_TAGS, PARTNER_TYPES, PROVINCES, REVENUE_BANDS, STAGES, USES_OF_FUNDS } from "./constants";

const ids = <T extends readonly { id: string }[]>(arr: T) => arr.map((a) => a.id) as [T[number]["id"], ...T[number]["id"][]];
const optionalText = (max = 200) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const money = z.coerce.number().min(0).max(10_000_000_000);
/** Optional numeric form field: "" or missing → null (z.coerce alone would turn "" into 0). */
const optNum = <T extends z.ZodTypeAny>(schema: T) => z.preprocess((v) => (v === "" || v == null ? null : v), schema.nullable().optional());

export const step1Schema = z.object({
  name: z.string().trim().min(2, "Enter your business name.").max(160),
  website: optionalText(200),
  business_number: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/\s/g, "") : null))
    .refine((v) => !v || /^\d{9}([A-Z]{2}\d{4})?$/i.test(v), "Use your 9-digit CRA business number, e.g. 123456789 or 123456789RC0001."),
  years_in_business: optNum(z.coerce.number().min(0).max(200)),
  industry: z.enum(ids(INDUSTRIES), { errorMap: () => ({ message: "Choose an industry so we can match you with the right partners." }) }),
  province: z.enum(PROVINCES),
  city: z.string().trim().min(1, "Enter your city.").max(80),
  annual_revenue: optNum(money),
  industry_other: optionalText(120),
  legal_structure: z.enum(ids(LEGAL_STRUCTURES), { errorMap: () => ({ message: "Choose your legal structure." }) }),
  incorporation_province: z.enum(PROVINCES).optional().or(z.literal("")).transform((v) => v || null),
  naics_code: z.string().trim().regex(/^\d{2,6}$/, "NAICS codes are 2–6 digits.").optional().or(z.literal("")).transform((v) => v || null),
  employees: optNum(z.coerce.number().int().min(0).max(1_000_000)),
  revenue_band: z.enum(ids(REVENUE_BANDS)).optional().or(z.literal("")).transform((v) => v || null),
  ownership_tags: z.array(z.enum(ids(OWNERSHIP_TAGS))).default([]),
  description: z.string().trim().max(1200, "Keep the description under 1,200 characters.").optional().transform((v) => v || null),
}).refine((d) => d.industry !== "other" || !!d.industry_other, { message: "Tell us your industry.", path: ["industry_other"] })

export const step2Schema = z.object({
  stage: z.enum(ids(STAGES), { errorMap: () => ({ message: "Choose the stage that best describes your business today." }) }),
});

export const step3Schema = z
  .object({
    amount_sought: z.coerce.number().positive("Enter the amount you are looking to raise, in CAD.").max(10_000_000_000),
    timeline: z.enum(["Under 3 months", "3–6 months", "6–12 months", "12+ months"]),
    funding_preference: z.enum(["dilutive", "non_dilutive", "either"]).default("either"),
    use_of_funds: z.array(z.enum(ids(USES_OF_FUNDS))).min(1, "Choose at least one use of funds."),
    hire_roles: optionalText(300),
    use_of_funds_other: optionalText(300),
  })
  .refine((v) => !v.use_of_funds.includes("hire_staff") || !!v.hire_roles, {
    message: "List the roles you plan to hire.",
    path: ["hire_roles"],
  })
  .refine((v) => !v.use_of_funds.includes("other") || !!v.use_of_funds_other, {
    message: "Describe the other use of funds.",
    path: ["use_of_funds_other"],
  });

export const historyRowSchema = z
  .object({
    source: z.enum(ids(FUNDING_SOURCES)),
    loan_subtype: z.enum(ids(LOAN_SUBTYPES)).optional().nullable(),
    amount: money,
    year: optNum(z.coerce.number().int().min(1950).max(2100)),
    status: z.enum(ids(FUNDING_STATUSES)).default("received"),
    provider_name: z.string().trim().max(160).optional().nullable().transform((v) => v || null),
  })
  .transform((r) => ({ ...r, loan_subtype: r.source === "business_loan" ? r.loan_subtype ?? "bank_other" : null }));
export const step4Schema = z.object({ history: z.array(historyRowSchema).max(50) });

export const tractionSchema = z.object({
  revenue_12m: optNum(money),
  growth_rate_pct: optNum(z.coerce.number().min(-100).max(100000)),
  customers: optNum(z.coerce.number().int().min(0).max(1e9)),
  key_metrics: z.array(z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(60) })).max(8).default([]),
  team: z.array(z.object({ name: z.string().trim().min(1).max(80), role: z.string().trim().min(1).max(80) })).max(12).default([]),
});

export const consentSchema = z.object({
  consent_matching: z.boolean(),
  consent_sharing: z.boolean(),
});

export const shareLinkSchema = z.object({
  label: z.string().trim().min(2, "Say who this link is for.").max(120),
  expires_in_days: z.coerce.number().int().min(0).max(365),
  password: z.string().max(100).optional(),
});

export const partnerApplicationSchema = z.object({
  type: z.enum(ids(PARTNER_TYPES)),
  display_name: z.string().trim().min(2).max(160),
  company: optionalText(160),
  contact_person: z.string().trim().min(2).max(120),
  contact_email: z.string().trim().email(),
  contact_phone: optionalText(40),
  location: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(1500).optional(),
  linkedin_url: z.string().trim().url().max(300).optional().or(z.literal("")),
  stages: z.array(z.enum(ids(STAGES))).min(1, "Choose at least one stage you serve."),
  industries: z.array(z.enum(ids(INDUSTRIES))).default([]),
  provinces: z.array(z.enum(PROVINCES)).default([]),
  min_amount: money.optional().nullable(),
  max_amount: money.optional().nullable(),
  details: z.record(z.string(), z.unknown()).default({}),
  agree: z.literal(true, { errorMap: () => ({ message: "Accept the partner terms to continue." }) }),
});

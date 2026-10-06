import { z } from "zod";
import { FUNDING_SOURCES, INDUSTRIES, LOAN_SUBTYPES, PARTNER_TYPES, PROVINCES, SERVICES, STAGES, USES_OF_FUNDS } from "./constants";

const ids = <T extends readonly { id: string }[]>(arr: T) => arr.map((a) => a.id) as [T[number]["id"], ...T[number]["id"][]];
const optionalText = (max = 200) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const money = z.coerce.number().min(0).max(10_000_000_000);

export const step1Schema = z.object({
  name: z.string().trim().min(2, "Enter your business name.").max(160),
  website: optionalText(200),
  business_number: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/\s/g, "") : null))
    .refine((v) => !v || /^\d{9}([A-Z]{2}\d{4})?$/i.test(v), "Use your 9-digit CRA business number, e.g. 123456789 or 123456789RC0001."),
  years_in_business: z.coerce.number().min(0).max(200).optional().nullable(),
  industry: z.enum(ids(INDUSTRIES), { errorMap: () => ({ message: "Choose an industry so we can match you with the right partners." }) }),
  province: z.enum(PROVINCES),
  city: z.string().trim().min(1, "Enter your city.").max(80),
  annual_revenue: money.optional().nullable(),
  contact_name: z.string().trim().min(1, "Enter a contact name.").max(120),
  contact_email: z.string().trim().email("Enter a valid email address."),
  contact_phone: optionalText(40),
});

export const step2Schema = z.object({
  stage: z.enum(ids(STAGES), { errorMap: () => ({ message: "Choose the stage that best describes your business today." }) }),
});

export const step3Schema = z
  .object({
    amount_sought: z.coerce.number().positive("Enter the amount you are looking to raise, in CAD.").max(10_000_000_000),
    timeline: z.enum(["Under 3 months", "3–6 months", "6–12 months", "12+ months"]),
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
    year: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  })
  .transform((r) => ({ ...r, loan_subtype: r.source === "business_loan" ? r.loan_subtype ?? "bank_other" : null }));
export const step4Schema = z.object({ history: z.array(historyRowSchema).max(50) });

export const step5Schema = z.object({
  consent_matching: z.boolean(),
  consent_sharing: z.boolean(),
});

export const quoteSchema = z.object({
  kind: z.enum(SERVICES.map((s) => s.kind) as [string, ...string[]]),
  message: z.string().trim().max(2000).optional(),
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

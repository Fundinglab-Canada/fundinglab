"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getMyBusiness, requireUser } from "@/lib/auth";
import { grantsForConfirmedEntity } from "@/lib/grants/lookup";
import { readiness } from "@/lib/readiness";
import { slugify } from "@/lib/format";
import { step1Schema, step2Schema, step3Schema, step4Schema, step5Schema } from "@/lib/validation";

export type StepState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

function firstErrors(issues: { path: (string | number)[]; message: string }[]): StepState {
  const fieldErrors: Record<string, string> = {};
  for (const i of issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
  return { error: issues[0]?.message, fieldErrors };
}

async function uniqueSlug(supabase: SupabaseClient, name: string): Promise<string> {
  const base = slugify(name) || "business";
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { count } = await supabase.from("businesses").select("id", { count: "exact", head: true }).eq("slug", candidate);
    if (!count) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function recomputeReadiness(supabase: SupabaseClient, businessId: string) {
  const [{ data: b }, { count: historyCount }, { data: docs }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", businessId).single(),
    supabase.from("funding_history").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("documents").select("kind").eq("business_id", businessId),
  ]);
  if (!b) return;
  const r = readiness({
    stage: b.stage,
    years_in_business: b.years_in_business,
    annual_revenue: b.annual_revenue,
    documents: (docs ?? []).map((d) => d.kind as string),
    funding_history_count: historyCount ?? 0,
    has_basics: !!(b.name && b.industry && b.amount_sought && b.use_of_funds?.length),
  });
  await supabase.from("businesses").update({ readiness_score: r.total }).eq("id", businessId);
}

async function advance(supabase: SupabaseClient, businessId: string, step: number): Promise<never> {
  await supabase.from("businesses").update({ profile_step: Math.min(6, step + 1) }).eq("id", businessId);
  await recomputeReadiness(supabase, businessId);
  revalidatePath("/dashboard");
  redirect(step >= 5 ? "/dashboard?welcome=1" : `/profile?step=${step + 1}`);
}

export async function saveBasics(_prev: StepState, formData: FormData): Promise<StepState> {
  const { userId } = await requireUser("/profile");
  const parsed = step1Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return firstErrors(parsed.error.issues);
  const supabase = await createClient();
  const existing = await getMyBusiness();

  let businessId = existing?.id;
  if (existing) {
    const { error } = await supabase.from("businesses").update(parsed.data).eq("id", existing.id);
    if (error) return { error: "We couldn't save your details. Try again." };
  } else {
    const { data, error } = await supabase
      .from("businesses")
      .insert({ ...parsed.data, owner_id: userId, slug: await uniqueSlug(supabase, parsed.data.name) })
      .select("id")
      .single();
    if (error || !data) return { error: "We couldn't create your profile. Try again." };
    businessId = data.id;
  }

  // Confirmed federal grants: re-derive from the mirror server-side and save to funding history.
  const entity = String(formData.get("confirmed_grant_entity") ?? "").trim();
  if (entity && businessId) {
    const grants = await grantsForConfirmedEntity(
      supabase,
      { name: parsed.data.name, province: parsed.data.province, city: parsed.data.city, businessNumber: parsed.data.business_number },
      entity,
    );
    const fallback = grants.length ? grants : await grantsForConfirmedEntity(supabase, { name: entity }, entity);
    if (fallback.length) {
      await supabase.from("funding_history").upsert(
        fallback.map((g) => ({
          business_id: businessId,
          source: "grant_federal",
          amount: g.amount,
          year: g.date ? Number(g.date.slice(0, 4)) : null,
          program_name: g.program,
          department: g.department,
          grant_owner_org: g.ownerOrg,
          grant_ref: g.ref,
          auto_found: true,
        })),
        { onConflict: "business_id,grant_owner_org,grant_ref" },
      );
      await supabase.from("businesses").update({ legal_name: parsed.data.name }).eq("id", businessId);
    }
  }
  return advance(supabase, businessId!, 1);
}

async function requireBusiness() {
  await requireUser("/profile");
  const b = await getMyBusiness();
  if (!b) redirect("/profile?step=1");
  return b;
}

export async function saveStage(_prev: StepState, formData: FormData): Promise<StepState> {
  const b = await requireBusiness();
  const parsed = step2Schema.safeParse({ stage: formData.get("stage") });
  if (!parsed.success) return firstErrors(parsed.error.issues);
  const supabase = await createClient();
  await supabase.from("businesses").update(parsed.data).eq("id", b.id);
  return advance(supabase, b.id, 2);
}

export async function saveNeed(_prev: StepState, formData: FormData): Promise<StepState> {
  const b = await requireBusiness();
  const parsed = step3Schema.safeParse({
    amount_sought: formData.get("amount_sought"),
    timeline: formData.get("timeline"),
    use_of_funds: formData.getAll("use_of_funds"),
    hire_roles: formData.get("hire_roles") ?? undefined,
    use_of_funds_other: formData.get("use_of_funds_other") ?? undefined,
  });
  if (!parsed.success) return firstErrors(parsed.error.issues);
  const supabase = await createClient();
  await supabase.from("businesses").update(parsed.data).eq("id", b.id);
  return advance(supabase, b.id, 3);
}

export async function saveHistory(_prev: StepState, formData: FormData): Promise<StepState> {
  const b = await requireBusiness();
  let rows: unknown;
  try {
    rows = JSON.parse(String(formData.get("history") ?? "[]"));
  } catch {
    return { error: "We couldn't read your funding rows. Refresh and try again." };
  }
  const parsed = step4Schema.safeParse({ history: rows });
  if (!parsed.success) return { error: "Check each row: choose a source and enter an amount in CAD." };
  const supabase = await createClient();
  // Replace manual rows; auto-found federal grants are kept.
  await supabase.from("funding_history").delete().eq("business_id", b.id).eq("auto_found", false);
  if (parsed.data.history.length) {
    const { error } = await supabase
      .from("funding_history")
      .insert(parsed.data.history.map((h) => ({ ...h, business_id: b.id, auto_found: false })));
    if (error) return { error: "We couldn't save your funding history. Try again." };
  }
  return advance(supabase, b.id, 4);
}

export async function saveConsent(_prev: StepState, formData: FormData): Promise<StepState> {
  const b = await requireBusiness();
  const parsed = step5Schema.parse({
    consent_matching: formData.get("consent_matching") === "on",
    consent_sharing: formData.get("consent_sharing") === "on",
  });
  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase
    .from("businesses")
    .update({
      ...parsed,
      consent_matching_at: parsed.consent_matching ? now : null,
      consent_sharing_at: parsed.consent_sharing ? now : null,
      ...(parsed.consent_sharing ? {} : { visibility: "private" }),
    })
    .eq("id", b.id);
  return advance(supabase, b.id, 5);
}

const MAX_BYTES = 25 * 1024 * 1024;
const KINDS = ["pitch_deck", "financials", "business_plan", "other"] as const;

export async function uploadDocument(formData: FormData) {
  const b = await requireBusiness();
  const file = formData.get("file");
  const kind = String(formData.get("kind"));
  if (!(file instanceof File) || !file.size || !KINDS.includes(kind as (typeof KINDS)[number])) redirect("/profile?step=5");
  if (file.size > MAX_BYTES) redirect("/profile?step=5&error=File%20is%20larger%20than%2025%20MB.");
  const supabase = await createClient();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120);
  const path = `${b.id}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type, upsert: false });
  if (error) redirect(`/profile?step=5&error=${encodeURIComponent("Upload failed. Use PDF, PowerPoint, Word, Excel or CSV under 25 MB.")}`);
  await supabase.from("documents").insert({
    business_id: b.id, kind, storage_path: path, file_name: file.name.slice(0, 200), mime_type: file.type, size_bytes: file.size,
  });
  await recomputeReadiness(supabase, b.id);
  revalidatePath("/profile");
  redirect("/profile?step=5");
}

export async function deleteDocument(formData: FormData) {
  const b = await requireBusiness();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("storage_path").eq("id", id).eq("business_id", b.id).single();
  if (doc) {
    await supabase.storage.from("documents").remove([doc.storage_path]);
    await supabase.from("documents").delete().eq("id", id);
    await recomputeReadiness(supabase, b.id);
  }
  revalidatePath("/profile");
  redirect("/profile?step=5");
}

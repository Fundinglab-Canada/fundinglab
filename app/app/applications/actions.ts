"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/auth";
import { hasFeature } from "@/lib/plans";
import { APP_STATUSES, APP_TYPES, DEFAULT_CHECKLIST, buildChecklist, isAppStatus, type ChecklistItem } from "@/lib/applications";

const UUID = /^[0-9a-f-]{36}$/i;

async function ctx() {
  const c = await requireBusinessContext("/app/applications");
  if (!hasFeature(c.plan, "applications")) redirect("/pricing?plan=starter");
  return c;
}

const money = z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().min(0).max(1e10).nullable());
const date = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable());

const createSchema = z.object({
  type: z.enum(APP_TYPES.map((t) => t.id) as [string, ...string[]]),
  title: z.string().trim().min(2, "Give the application a name.").max(200),
  provider: z.string().trim().max(200).optional(),
  funding_source: z.enum(["angel", "venture_capital", "private_equity"]).optional(),
  amount_requested: money,
  due_date: date,
});

export async function createApplication(formData: FormData) {
  const { business } = await ctx();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/app/applications?new=1&error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  const supabase = await createClient();
  const { data: docs } = await supabase.from("documents").select("id, kind, folder, file_name").eq("business_id", business.id);
  const d = parsed.data;
  const { data, error } = await supabase.from("applications").insert({
    business_id: business.id, type: d.type, title: d.title, provider: d.provider || null,
    funding_source: d.type === "investor" ? d.funding_source ?? "angel" : null,
    amount_requested: d.amount_requested, due_date: d.due_date,
    checklist: buildChecklist(DEFAULT_CHECKLIST[d.type], (docs ?? []) as { id: string; kind: string; folder: string; file_name: string }[]),
  }).select("id").single();
  if (error || !data) redirect("/app/applications?error=We%20couldn%27t%20create%20the%20application.");
  revalidatePath("/app/applications");
  redirect(`/app/applications/${data.id}`);
}

/** Kanban move. Declining from the board asks for a reason on the detail page. */
export async function moveApplication(id: string, status: string) {
  await ctx();
  if (!UUID.test(id) || !isAppStatus(status)) return;
  const supabase = await createClient();
  await supabase.from("applications").update({ status, position: Date.now() % 1_000_000 }).eq("id", id);
  revalidatePath("/app/applications");
  revalidatePath(`/app/applications/${id}`);
  revalidatePath("/app");
}

const updateSchema = z.object({
  id: z.string().regex(UUID),
  title: z.string().trim().min(2).max(200),
  provider: z.string().trim().max(200).optional(),
  status: z.enum(APP_STATUSES.map((s) => s.id) as [string, ...string[]]),
  amount_requested: money,
  amount_approved: money,
  due_date: date,
  decline_reason: z.string().trim().max(1000).optional(),
  notes: z.string().max(5000).optional(),
});

export async function updateApplication(formData: FormData) {
  await ctx();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  const id = String(formData.get("id"));
  if (!parsed.success) redirect(`/app/applications/${UUID.test(id) ? id : ""}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  const d = parsed.data;
  if (d.status === "declined" && !d.decline_reason) redirect(`/app/applications/${d.id}?error=${encodeURIComponent("Tell us why it was declined so we can suggest fixes.")}`);
  const reason = d.decline_reason || null;
  const supabase = await createClient();
  const { error } = await supabase.from("applications").update({
    title: d.title, provider: d.provider || null, status: d.status, amount_requested: d.amount_requested,
    amount_approved: d.amount_approved, due_date: d.due_date, decline_reason: d.status === "declined" ? reason : null, notes: d.notes ?? null,
  }).eq("id", d.id);
  if (error) redirect(`/app/applications/${d.id}?error=${encodeURIComponent("We couldn't save your changes.")}`);
  revalidatePath("/app/applications");
  revalidatePath(`/app/applications/${d.id}`);
  revalidatePath("/app");
  redirect(`/app/applications/${d.id}?saved=1`);
}

export async function toggleChecklistItem(formData: FormData) {
  await ctx();
  const id = String(formData.get("id") ?? "");
  const item = String(formData.get("item") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select("checklist").eq("id", id).single();
  if (!data) return;
  const list = (data.checklist as ChecklistItem[]).map((c) => (c.id === item ? { ...c, done: !c.done } : c));
  await supabase.from("applications").update({ checklist: list }).eq("id", id);
  revalidatePath(`/app/applications/${id}`);
}

export async function addChecklistItem(formData: FormData) {
  await ctx();
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim().slice(0, 200);
  if (!UUID.test(id) || label.length < 2) return;
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select("checklist").eq("id", id).single();
  if (!data) return;
  const list = data.checklist as ChecklistItem[];
  if (list.length >= 40) return;
  await supabase.from("applications").update({ checklist: [...list, { id: `c${Date.now().toString(36)}`, label, done: false }] }).eq("id", id);
  revalidatePath(`/app/applications/${id}`);
}

export async function deleteApplication(formData: FormData) {
  await ctx();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("applications").delete().eq("id", id).neq("status", "approved");
  revalidatePath("/app/applications");
  redirect("/app/applications");
}

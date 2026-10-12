"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/auth";
import { hasFeature } from "@/lib/plans";
import { buildChecklist, DEFAULT_CHECKLIST } from "@/lib/applications";
import { programDeadline } from "@/lib/programs/match";

const UUID = /^[0-9a-f-]{36}$/i;

export async function toggleSaved(formData: FormData) {
  const { business } = await requireBusinessContext("/app/grants");
  const programId = String(formData.get("program_id") ?? "");
  const back = String(formData.get("back") ?? "/app/grants");
  if (!UUID.test(programId)) return;
  const supabase = await createClient();
  if (formData.get("saved") === "1") {
    await supabase.from("saved_programs").delete().eq("business_id", business.id).eq("program_id", programId);
  } else {
    await supabase.from("saved_programs").upsert({ business_id: business.id, program_id: programId, alert_enabled: false }, { onConflict: "business_id,program_id" });
  }
  revalidatePath("/app/grants");
  revalidatePath(back);
}

export async function toggleAlert(formData: FormData) {
  const { business, plan } = await requireBusinessContext("/app/grants");
  const programId = String(formData.get("program_id") ?? "");
  if (!UUID.test(programId)) return;
  if (!hasFeature(plan, "program_alerts")) redirect("/pricing?plan=starter");
  const on = formData.get("on") === "1";
  const supabase = await createClient();
  await supabase.from("saved_programs").upsert(
    { business_id: business.id, program_id: programId, alert_enabled: on },
    { onConflict: "business_id,program_id" },
  );
  revalidatePath("/app/grants");
  revalidatePath(String(formData.get("back") ?? "/app/grants"));
}

/** "Start application": creates an Application Center card with a checklist from the program's required documents. */
export async function startApplication(formData: FormData) {
  const { business, plan } = await requireBusinessContext("/app/grants");
  if (!hasFeature(plan, "applications")) redirect("/pricing?plan=starter");
  const programId = String(formData.get("program_id") ?? "");
  if (!UUID.test(programId)) redirect("/app/grants");
  const supabase = await createClient();
  const { data: existing } = await supabase.from("applications").select("id").eq("business_id", business.id).eq("program_id", programId)
    .not("status", "in", "(approved,declined)").limit(1).maybeSingle();
  if (existing) redirect(`/app/applications/${existing.id}`);

  const [{ data: p }, { data: docs }] = await Promise.all([
    supabase.from("programs").select("id, name, funder, type, max_amount, required_docs, close_at, intake_close").eq("id", programId).single(),
    supabase.from("documents").select("id, kind, folder, file_name").eq("business_id", business.id),
  ]);
  if (!p) redirect("/app/grants");
  const type = p.type === "loan" ? "loan" : p.type === "equity" ? "investor" : "grant";
  const required = (p.required_docs as string[] | null)?.length ? (p.required_docs as string[]) : DEFAULT_CHECKLIST[type];
  const deadline = programDeadline(p);
  const need = Number(business.amount_sought ?? 0);
  const { data: created, error } = await supabase.from("applications").insert({
    business_id: business.id,
    type,
    program_id: p.id,
    title: p.name,
    provider: p.funder,
    amount_requested: need ? (p.max_amount ? Math.min(need, Number(p.max_amount)) : need) : null,
    due_date: deadline ? deadline.toISOString().slice(0, 10) : null,
    checklist: buildChecklist(required, (docs ?? []) as { id: string; kind: string; folder: string; file_name: string }[]),
  }).select("id").single();
  if (error || !created) redirect("/app/applications?error=We%20couldn%27t%20create%20the%20application.");
  await supabase.from("saved_programs").upsert({ business_id: business.id, program_id: p.id }, { onConflict: "business_id,program_id", ignoreDuplicates: true });
  revalidatePath("/app/applications");
  redirect(`/app/applications/${created.id}`);
}

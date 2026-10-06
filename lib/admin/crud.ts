"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ADMIN_TABLES, parseRow, type AdminTable } from "./tables";
import { safeNext } from "@/lib/safe-next";

const isTable = (t: unknown): t is AdminTable => typeof t === "string" && t in ADMIN_TABLES;

/** Generic insert/update for whitelisted admin tables. RLS also requires is_admin() on every one of them. */
export async function adminSaveRow(formData: FormData) {
  await requireRole("admin", "/admin");
  const table = formData.get("_table");
  const back = safeNext(formData.get("_back"), "/admin");
  if (!isTable(table)) throw new Error("Unknown table");
  let row: Record<string, unknown>;
  try {
    row = parseRow(table, formData);
  } catch (e) {
    redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent((e as Error).message)}`);
  }
  const supabase = await createClient();
  const id = String(formData.get("_id") ?? "");
  const { error } = id
    ? await supabase.from(table).update({ ...row, ...(table === "programs" || table === "jobs" || table === "team_members" ? { updated_at: new Date().toISOString() } : {}) }).eq("id", id)
    : await supabase.from(table).insert(row);
  if (error) redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`);
  revalidatePath("/", "layout");
  redirect(`${back}${back.includes("?") ? "&" : "?"}saved=1`);
}

export async function adminDeleteRow(formData: FormData) {
  await requireRole("admin", "/admin");
  const table = formData.get("_table");
  const back = safeNext(formData.get("_back"), "/admin");
  if (!isTable(table) || table === "programs") throw new Error("Not deletable"); // programs are deactivated, not deleted
  const supabase = await createClient();
  await supabase.from(table).delete().eq("id", String(formData.get("_id")));
  revalidatePath("/", "layout");
  redirect(back);
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/auth";
import { STACK_SOURCES } from "@/lib/roadmap";

/** Marks a roadmap step done / not done. */
export async function toggleStep(formData: FormData) {
  const { business } = await requireBusinessContext("/app/roadmap");
  const id = String(formData.get("step") ?? "").slice(0, 60);
  const done = formData.get("done") === "1";
  if (!/^[a-z_]+$/.test(id)) return;
  const supabase = await createClient();
  const { data } = await supabase.from("roadmaps").select("done_steps").eq("business_id", business.id).maybeSingle();
  const current = new Set<string>((data?.done_steps as string[] | undefined) ?? []);
  if (done) current.add(id); else current.delete(id);
  await supabase.from("roadmaps").upsert({ business_id: business.id, done_steps: [...current] }, { onConflict: "business_id" });
  revalidatePath("/app/roadmap");
}

const ids = STACK_SOURCES.map((s) => s.id) as [string, ...string[]];
const stackSchema = z.object({
  target: z.coerce.number().min(0).max(1e10),
  preMoney: z.coerce.number().min(0).max(1e12).nullable(),
  items: z.array(z.object({
    id: z.string().max(20),
    source: z.enum(ids),
    amount: z.coerce.number().min(0).max(1e10),
    cost: z.coerce.number().min(0).max(100).optional(),
  })).max(20),
});

export type StackState = { ok?: boolean; error?: string } | undefined;

export async function saveStack(_prev: StackState, formData: FormData): Promise<StackState> {
  const { business } = await requireBusinessContext("/app/roadmap");
  let raw: unknown;
  try { raw = JSON.parse(String(formData.get("stack") ?? "{}")); } catch { return { error: "Something went wrong. Reload and try again." }; }
  const parsed = stackSchema.safeParse(raw);
  if (!parsed.success) return { error: "Check the amounts: numbers only, no more than 20 sources." };
  const supabase = await createClient();
  const { error } = await supabase.from("roadmaps").upsert({
    business_id: business.id,
    capital_stack: { items: parsed.data.items, pre_money: parsed.data.preMoney },
    target_amount: parsed.data.target,
  }, { onConflict: "business_id" });
  if (error) return { error: "We couldn't save your stack. Try again." };
  revalidatePath("/app/roadmap");
  revalidatePath("/app");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

/** Business or partner accepts / declines an admin-approved introduction (fl_respond_to_match checks ownership). */
export async function respondToIntroduction(formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("fl_respond_to_match", {
    p_match_id: String(formData.get("match_id")),
    p_accept: formData.get("accept") === "yes",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/partner");
}

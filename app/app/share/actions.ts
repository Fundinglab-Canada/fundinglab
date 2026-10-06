"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMyBusiness, requireUser } from "@/lib/auth";
import { shareLinkSchema } from "@/lib/validation";

export async function setVisibility(formData: FormData) {
  await requireUser("/app/share");
  const b = await getMyBusiness();
  if (!b) redirect("/app/profile?step=1");
  const visibility = z.enum(["private", "link", "partners"]).parse(formData.get("visibility"));
  if (visibility === "partners" && !b.consent_sharing) redirect("/app/share?error=Turn%20on%20sharing%20consent%20first.");
  const supabase = await createClient();
  await supabase.from("businesses").update({ visibility }).eq("id", b.id);
  revalidatePath("/app/share");
}

export async function createShareLink(formData: FormData) {
  await requireUser("/app/share");
  const b = await getMyBusiness();
  if (!b) redirect("/app/profile?step=1");
  const parsed = shareLinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/app/share?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  const { label, expires_in_days, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fl_create_share_link", {
    p_business_id: b.id,
    p_label: label,
    p_expires_at: expires_in_days ? new Date(Date.now() + expires_in_days * 864e5).toISOString() : null,
    p_password: password || null,
  });
  if (error || !data?.[0]) redirect(`/app/share?error=${encodeURIComponent(error?.message ?? "Could not create the link.")}`);
  redirect(`/app/share?created=${encodeURIComponent(data[0].token)}`);
}

export async function revokeShareLink(formData: FormData) {
  await requireUser("/app/share");
  const supabase = await createClient();
  await supabase.from("share_links").update({ revoked_at: new Date().toISOString() }).eq("id", String(formData.get("id")));
  revalidatePath("/app/share");
}

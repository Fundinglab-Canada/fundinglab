"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessContext } from "@/lib/auth";
import { dataRoomViewerLimit, hasFeature } from "@/lib/plans";
import { BUSINESS_PLAN_SECTIONS, FOLDER_IDS, SHARE_CLASSES } from "@/lib/prep";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { dateShort } from "@/lib/format";

const UUID = /^[0-9a-f-]{36}$/i;
const ROOM = "/app/prep/data-room";
const back = (e?: string, ok?: string) => `${ROOM}${e ? `?error=${encodeURIComponent(e)}` : ok ? `?ok=${encodeURIComponent(ok)}` : ""}`;

async function roomCtx() {
  const c = await requireBusinessContext(ROOM);
  if (!hasFeature(c.plan, "data_room")) redirect("/pricing?plan=growth");
  return c;
}

// ---------------------------------------------------------------- Data room
const MAX_BYTES = 25 * 1024 * 1024;
const KINDS = ["pitch_deck", "financials", "business_plan", "tax_returns", "cap_table", "incorporation", "registration_noa", "other"] as const;
const MIME_OK = /^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.[\w.]+|vnd\.ms-(excel|powerpoint))|text\/csv)$/;

export async function uploadToDataRoom(formData: FormData) {
  const { business } = await roomCtx();
  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "other");
  const kind = String(formData.get("kind") ?? "other");
  const replaces = String(formData.get("replaces") ?? "");
  if (!(file instanceof File) || !file.size) redirect(back("Choose a file to upload."));
  if (!(FOLDER_IDS as readonly string[]).includes(folder) || !(KINDS as readonly string[]).includes(kind)) redirect(back("Choose a folder."));
  if (file.size > MAX_BYTES) redirect(back("File is larger than 25 MB."));
  if (!MIME_OK.test(file.type)) redirect(back("Use PDF, PowerPoint, Word, Excel or CSV."));
  const supabase = await createClient();

  let version = 1;
  let previous: string | null = null;
  if (UUID.test(replaces)) {
    const { data: old } = await supabase.from("documents").select("id, version, kind, folder").eq("id", replaces).eq("business_id", business.id).maybeSingle();
    if (old) { version = Number(old.version) + 1; previous = old.id; }
  }
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120);
  const path = `${business.id}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type, upsert: false });
  if (error) redirect(back("Upload failed. Try again."));
  const { error: insErr } = await supabase.from("documents").insert({
    business_id: business.id, kind, folder, storage_path: path, file_name: file.name.slice(0, 200), mime_type: file.type,
    size_bytes: file.size, version, previous_id: previous,
  });
  if (insErr) {
    await supabase.storage.from("documents").remove([path]);
    redirect(back("We couldn't save the file. Try again."));
  }
  revalidatePath(ROOM);
  revalidatePath("/app/profile");
  redirect(back(undefined, previous ? `Uploaded version ${version}.` : "Uploaded."));
}

export async function deleteDataRoomDoc(formData: FormData) {
  const { business } = await roomCtx();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  // Deleting a document removes all its earlier versions too.
  const chain: { id: string; storage_path: string }[] = [];
  let cursor: string | null = id;
  while (cursor && chain.length < 50) {
    const { data: d }: { data: { id: string; storage_path: string; previous_id: string | null } | null } =
      await supabase.from("documents").select("id, storage_path, previous_id").eq("id", cursor).eq("business_id", business.id).maybeSingle();
    if (!d) break;
    chain.push(d);
    cursor = d.previous_id;
  }
  if (chain.length) {
    await supabase.storage.from("documents").remove(chain.map((d) => d.storage_path));
    await supabase.from("documents").delete().in("id", chain.map((d) => d.id));
  }
  revalidatePath(ROOM);
  revalidatePath("/app/profile");
  redirect(back(undefined, "Deleted."));
}

export async function setWatermark(formData: FormData) {
  const { business } = await roomCtx();
  const supabase = await createClient();
  await supabase.from("data_rooms").upsert({ business_id: business.id, watermark_enabled: formData.get("on") === "1" }, { onConflict: "business_id" });
  revalidatePath(ROOM);
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  days: z.coerce.number().int().min(1).max(90),
  can_download: z.literal("on").optional(),
});

export async function inviteViewer(formData: FormData) {
  const { business, plan, profile } = await roomCtx();
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(back(parsed.error.issues[0].message));
  const supabase = await createClient();
  const { count } = await supabase.from("data_room_access").select("id", { count: "exact", head: true })
    .eq("business_id", business.id).is("revoked_at", null).gt("expires_at", new Date().toISOString());
  if ((count ?? 0) >= dataRoomViewerLimit(plan)) redirect(back(`Your plan allows ${dataRoomViewerLimit(plan)} active viewers. Revoke one or upgrade to Pro.`));
  const expires = new Date(Date.now() + parsed.data.days * 864e5);
  const { data, error } = await supabase.from("data_room_access").insert({
    business_id: business.id, email: parsed.data.email, expires_at: expires.toISOString(), can_download: !!parsed.data.can_download, created_by: profile.id,
  }).select("token").single();
  if (error || !data) redirect(back("We couldn't create the invitation."));
  const link = `${env.siteUrl()}/data-room/${data.token}`;
  await sendEmail({
    to: parsed.data.email,
    replyTo: business.contact_email ?? profile.email ?? undefined,
    subject: `${business.name} shared its data room with you`,
    text: `${business.name} has given you access to its data room on Funding Lab.\n\nOpen it: ${link}\n\nAccess expires ${dateShort(expires)}.${parsed.data.can_download ? "" : " Files are view-only."} Documents are confidential and watermarked with your email address.`,
  });
  revalidatePath(ROOM);
  redirect(back(undefined, `Invitation sent to ${parsed.data.email}.`));
}

export async function revokeViewer(formData: FormData) {
  const { business } = await roomCtx();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("data_room_access").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("business_id", business.id);
  revalidatePath(ROOM);
}

export async function toggleViewerDownload(formData: FormData) {
  const { business } = await roomCtx();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("data_room_access").update({ can_download: formData.get("on") === "1" }).eq("id", id).eq("business_id", business.id);
  revalidatePath(ROOM);
}

// ---------------------------------------------------------------- Business plan
export async function saveBusinessPlan(formData: FormData) {
  const { business, plan } = await requireBusinessContext("/app/prep/business-plan");
  if (!hasFeature(plan, "prep_templates")) redirect("/pricing?plan=starter");
  const sections: Record<string, string> = {};
  for (const s of BUSINESS_PLAN_SECTIONS) sections[s.id] = String(formData.get(s.id) ?? "").slice(0, 8000);
  const supabase = await createClient();
  const { error } = await supabase.from("business_plans").upsert({ business_id: business.id, sections }, { onConflict: "business_id" });
  revalidatePath("/app/prep");
  redirect(`/app/prep/business-plan?${error ? "error=We%20couldn%27t%20save." : "saved=1"}`);
}

// ---------------------------------------------------------------- Cap table
const capSchema = z.array(z.object({
  holder: z.string().trim().max(120),
  class: z.enum(SHARE_CLASSES),
  shares: z.coerce.number().int().min(0).max(1e12),
  options: z.coerce.number().int().min(0).max(1e12),
})).max(100);

export type CapState = { ok?: boolean; error?: string } | undefined;

export async function saveCapTable(_prev: CapState, formData: FormData): Promise<CapState> {
  const { business, plan } = await requireBusinessContext("/app/prep/cap-table");
  if (!hasFeature(plan, "prep_templates")) return { error: "The cap table editor is part of Starter." };
  let raw: unknown;
  try { raw = JSON.parse(String(formData.get("entries") ?? "[]")); } catch { return { error: "Something went wrong. Reload and try again." }; }
  const parsed = capSchema.safeParse(raw);
  if (!parsed.success) return { error: "Check the rows: whole numbers only, up to 100 holders." };
  const supabase = await createClient();
  const { error } = await supabase.from("cap_tables").upsert({ business_id: business.id, entries: parsed.data.filter((e) => e.holder) }, { onConflict: "business_id" });
  if (error) return { error: "We couldn't save the cap table." };
  revalidatePath("/app/prep");
  return { ok: true };
}

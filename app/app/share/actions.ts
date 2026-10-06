"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMyBusiness, requireUser } from "@/lib/auth";

const contactSchema = z.object({
  contact_name: z.string().trim().min(2, "Enter your name.").max(120),
  contact_email: z.string().trim().email("Enter a valid email address."),
  contact_phone: z.string().trim().min(7, "Enter a contact number.").max(40).regex(/^[+\d().\s-]+$/, "Enter a valid phone number."),
});

/** Owners confirm their contact details before the snapshot summary is shown. Sharing itself is managed by admins. */
export async function confirmContact(formData: FormData) {
  await requireUser("/app/share");
  const b = await getMyBusiness();
  if (!b) redirect("/app/profile?step=1");
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/app/share?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update(parsed.data).eq("id", b.id);
  if (error) redirect(`/app/share?error=${encodeURIComponent("We couldn't save your details. Try again.")}`);
  revalidatePath("/app/share");
  redirect("/app/share");
}

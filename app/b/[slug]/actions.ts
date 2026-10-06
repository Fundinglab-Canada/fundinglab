"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** Keeps the share password out of URLs and logs: stored in a short-lived httpOnly cookie scoped to this profile. */
export async function unlockShare(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").replace(/[^a-z0-9-]/g, "");
  const token = String(formData.get("s") ?? "").replace(/[^A-Za-z0-9_-]/g, "");
  const store = await cookies();
  const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: `/b/${slug}`, maxAge: 60 * 60 };
  store.set(`fl_share_pw_${token}`, String(formData.get("pw") ?? "").slice(0, 100), opts);
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  if (email) store.set(`fl_share_email_${token}`, email, opts);
  redirect(`/b/${slug}?s=${encodeURIComponent(token)}&tried=1`);
}

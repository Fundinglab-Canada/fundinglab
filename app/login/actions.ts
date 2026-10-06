"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";
import { rateLimit } from "@/lib/turnstile";

const back = (path: string, params: Record<string, string>) => `${path}?${new URLSearchParams(params).toString()}`;
const callback = (next: string) => `${env.siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;

export async function signInWithPassword(formData: FormData) {
  const next = safeNext(formData.get("next"));
  if (!(await rateLimit("login", 10, 10 * 60_000))) redirect(back("/login", { error: "Too many attempts. Try again in a few minutes.", next }));
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(back("/login", { error: "That email and password don't match. Try again or use a sign-in link.", next }));
  redirect(next);
}

export async function signInWithEmail(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) redirect(back("/login", { error: "Enter a valid email address.", next }));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: callback(next), data: { intended_role: formData.get("role") === "partner" ? "partner" : "business" } },
  });
  if (error) redirect(back("/login", { error: error.message, next }));
  redirect(back("/login", { sent: "1", next }));
}

export async function signInWithProvider(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const provider = formData.get("provider") === "linkedin_oidc" ? "linkedin_oidc" : "google";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: callback(next) } });
  if (error || !data.url) redirect(back("/login", { error: error?.message ?? "Sign-in failed. Try again." }));
  redirect(data.url);
}

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters for your password.").max(72),
  role: z.enum(["business", "partner"]),
  terms: z.literal("on", { errorMap: () => ({ message: "Accept the Terms and Privacy Policy to continue." }) }),
  marketing: z.literal("on").optional(),
});

export async function signUp(formData: FormData) {
  const next = safeNext(formData.get("next"), "/onboarding");
  const role = formData.get("role") === "partner" ? "partner" : "business";
  if (!(await rateLimit("signup", 5, 10 * 60_000))) redirect(back("/signup", { error: "Too many attempts. Try again later.", next, role }));
  const parsed = signupSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect(back("/signup", { error: parsed.error.issues[0].message, next, role }));
  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: callback(next),
      data: { full_name: d.full_name, intended_role: d.role, marketing_opt_in: !!d.marketing, stage: String(formData.get("stage") ?? "") },
    },
  });
  if (error) redirect(back("/signup", { error: error.message, next, role }));
  // With email confirmation on (recommended), there's no session yet.
  if (!data.session) redirect(back("/signup", { sent: "1", email: d.email }));
  redirect(next);
}

export async function requestPasswordReset(formData: FormData) {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) redirect(back("/forgot-password", { error: "Enter a valid email address." }));
  if (await rateLimit("reset", 5, 10 * 60_000)) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: callback("/reset-password") });
  }
  // Same response whether or not the account exists.
  redirect(back("/forgot-password", { sent: "1" }));
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 10) redirect(back("/reset-password", { error: "Use at least 10 characters." }));
  if (password !== formData.get("confirm")) redirect(back("/reset-password", { error: "The passwords don't match." }));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(back("/reset-password", { error: "Your reset link has expired. Request a new one." }));
  redirect("/app?password=updated");
}

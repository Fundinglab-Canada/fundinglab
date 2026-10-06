import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getSessionProfile(): Promise<{ userId: string; profile: Profile } | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
  if (!profile) return null;
  return { userId: data.user.id, profile: profile as Profile };
}

export async function requireUser(next = "/app") {
  const s = await getSessionProfile();
  if (!s) redirect(`/login?next=${encodeURIComponent(next)}`);
  return s;
}

export async function requireRole(role: Profile["role"], next: string) {
  const s = await requireUser(next);
  if (s.profile.role !== role && s.profile.role !== "admin") redirect("/app");
  if (role === "admin" && s.profile.role !== "admin") redirect("/app");
  return s;
}

/** The signed-in owner's business (one per owner in v1). */
export async function getMyBusiness() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as import("@/lib/types").Business | null;
}

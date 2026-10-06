import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // First sign-in (any provider) goes through onboarding once.
      const { data: profile } = await supabase.from("profiles").select("onboarded").eq("id", data.user.id).single();
      if (profile && !profile.onboarded && !next.startsWith("/onboarding") && next !== "/reset-password") {
        return NextResponse.redirect(new URL(`/onboarding?next=${encodeURIComponent(next)}`, url.origin));
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=Your%20link%20has%20expired.%20Request%20a%20new%20one.", url.origin));
}

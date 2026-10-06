import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { lookupGrants } from "@/lib/grants/lookup";

const body = z.object({
  name: z.string().trim().min(1).max(200),
  province: z.string().length(2).nullish(),
  city: z.string().max(80).nullish(),
  businessNumber: z.string().max(20).nullish(),
  rejected: z.array(z.string().max(200)).max(20).default([]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in to look up grant history." }, { status: 401 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const result = await lookupGrants(supabase, auth.user.id, parsed.data, parsed.data.rejected);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error(e);
    // Lookup is a convenience: fail quietly so onboarding continues.
    return NextResponse.json({ state: "none" });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/turnstile";

const body = z.object({ name: z.string().trim().min(4).max(200), province: z.string().length(2).optional() });

/** Public teaser: returns only whether a confident match exists and how many agreements. No details. */
export async function POST(request: Request) {
  if (!(await rateLimit("grant-teaser", 8, 60_000))) {
    return NextResponse.json({ error: "Too many checks. Try again in a minute." }, { status: 429 });
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ found: false });
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("fl_grant_teaser", { p_name: parsed.data.name, p_province: parsed.data.province ?? null });
    return NextResponse.json(data ?? { found: false }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ found: false });
  }
}

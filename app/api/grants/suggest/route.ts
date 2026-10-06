import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { suggestRecipients } from "@/lib/grants/live";
import { rateLimit } from "@/lib/turnstile";

const body = z.object({ name: z.string().trim().min(3).max(200) });

/** Live company-name suggestions from Government of Canada grant records, as the owner types on profile step 1. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ suggestions: [] }, { status: 401 });
  if (!(await rateLimit("grant-suggest", 40, 60_000))) return NextResponse.json({ suggestions: [] }, { status: 429 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ suggestions: [] });
  try {
    return NextResponse.json({ suggestions: await suggestRecipients(parsed.data.name) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ suggestions: [] });
  }
}

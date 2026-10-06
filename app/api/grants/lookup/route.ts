import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { lookupGrants } from "@/lib/grants/lookup";
import { grantsForRecipient } from "@/lib/grants/live";
import type { LookupResult } from "@/lib/grants/classify";

const body = z.object({
  name: z.string().trim().min(1).max(200),
  province: z.string().length(2).nullish(),
  city: z.string().max(80).nullish(),
  businessNumber: z.string().max(20).nullish(),
  rejected: z.array(z.string().max(200)).max(20).default([]),
  /** The owner picked this exact name from the live suggestions. */
  selected: z.boolean().default(false),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in to look up grant history." }, { status: 401 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    let result = await lookupGrants(supabase, auth.user.id, parsed.data, parsed.data.rejected);
    // A name chosen from the live suggestions: if the local mirror has no confident match, read the live records.
    if (parsed.data.selected && result.state !== "match") {
      const grants = await grantsForRecipient(parsed.data.name);
      result = grants.length
        ? { state: "match", entity: parsed.data.name, legalName: parsed.data.name, grants, total: grants.reduce((s, g) => s + g.amount, 0) }
        : ({ state: "none" } satisfies LookupResult);
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error(e);
    // Lookup is a convenience: fail quietly so onboarding continues.
    return NextResponse.json({ state: "none" });
  }
}

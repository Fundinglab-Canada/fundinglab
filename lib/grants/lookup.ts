import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyLookup, grantsForEntity, type Grant, type GrantLookupRow, type LookupResult } from "./classify";
import { normalizeName } from "./normalize";

const CACHE_DAYS = 7; // the mirror refreshes weekly

export type LookupInput = { name: string; province?: string | null; city?: string | null; businessNumber?: string | null };

async function fetchRows(supabase: SupabaseClient, input: LookupInput): Promise<GrantLookupRow[]> {
  const { data, error } = await supabase.rpc("fl_grant_lookup", {
    p_name: input.name,
    p_province: input.province ?? null,
    p_city: input.city ?? null,
    p_business_number: input.businessNumber ?? null,
    p_limit: 150,
  });
  if (error) throw new Error(`Grant lookup failed: ${error.message}`);
  return (data ?? []) as GrantLookupRow[];
}

/** Runs (or reuses a cached) lookup for the signed-in user and records it in grant_lookups. */
export async function lookupGrants(
  supabase: SupabaseClient,
  userId: string,
  input: LookupInput,
  rejected: string[] = [],
): Promise<LookupResult> {
  const queryNorm = normalizeName(input.name);
  if (queryNorm.length < 3 && !input.businessNumber) return { state: "none" };

  // Cache hit: same normalized query + place in the last week (reads only the user's own rows under RLS).
  if (!rejected.length && !input.businessNumber) {
    const since = new Date(Date.now() - CACHE_DAYS * 864e5).toISOString();
    const { data: cached } = await supabase
      .from("grant_lookups")
      .select("result")
      .eq("query_norm", queryNorm)
      .eq("province", input.province ?? "")
      .eq("city", input.city ?? "")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cached?.result && (cached.result as LookupResult).state) return cached.result as LookupResult;
  }

  const rows = await fetchRows(supabase, input);
  const result = classifyLookup(rows, rejected);
  await supabase.from("grant_lookups").insert({
    created_by: userId,
    query_name: input.name.slice(0, 200),
    query_norm: queryNorm,
    province: input.province ?? "",
    city: input.city ?? "",
    outcome: result.state,
    result,
  });
  return result;
}

/** Server-side re-derivation of a confirmed entity's grants, so the client never supplies amounts. */
export async function grantsForConfirmedEntity(supabase: SupabaseClient, input: LookupInput, entity: string): Promise<Grant[]> {
  const rows = await fetchRows(supabase, input);
  return grantsForEntity(rows, entity);
}

import "server-only";
import { headers } from "next/headers";

/**
 * Cloudflare Turnstile verification for public forms (§13). When TURNSTILE_SECRET_KEY is unset
 * (local dev, CI) verification is skipped so forms keep working.
 */
export async function verifyTurnstile(formData: FormData): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  const token = formData.get("cf-turnstile-response");
  if (typeof token !== "string" || !token) return false;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  const body = new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) });
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}

// Best-effort per-instance rate limiter for public endpoints. Use a shared store (e.g. Upstash Redis) in production.
const hits = new Map<string, { count: number; reset: number }>();
export async function rateLimit(key: string, limit = 10, windowMs = 60_000): Promise<boolean> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const k = `${key}:${ip}`;
  const now = Date.now();
  const entry = hits.get(k);
  if (!entry || entry.reset < now) {
    hits.set(k, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

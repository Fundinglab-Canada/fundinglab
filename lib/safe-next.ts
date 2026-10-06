/** Only same-site relative paths are allowed as post-login destinations (prevents open redirects). */
export const safeNext = (v: unknown, fallback = "/app") =>
  typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;

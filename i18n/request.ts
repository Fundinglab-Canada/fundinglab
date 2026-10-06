import { getRequestConfig } from "next-intl/server";

// English at launch (spec §2). French is added by creating messages/fr.json and choosing the locale here
// (e.g. from a cookie or Accept-Language) — no component changes needed for strings already in messages.
export default getRequestConfig(async () => {
  const locale = "en";
  return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});

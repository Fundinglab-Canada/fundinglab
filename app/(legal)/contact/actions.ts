"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { sendEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  message: z.string().trim().min(5).max(4000),
  company_website: z.string().max(0).optional(), // honeypot
});

export async function sendContact(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (parsed.success) {
    const to = process.env.ADMIN_NOTIFY_EMAIL;
    if (to) {
      await sendEmail({
        to,
        subject: `Contact form: ${parsed.data.name}`,
        text: `${parsed.data.name} <${parsed.data.email}>\n\n${parsed.data.message}`,
      });
    }
  }
  redirect("/contact?sent=1");
}

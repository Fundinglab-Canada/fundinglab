# Funding Lab admin guide

One page for the team. Everything here is enforced by database rules (RLS), not just the screens: if a screen lets you do it, you're allowed to.

## Daily (10 minutes)

- **Overview** — check *Needs attention*: partner applications, partner interest, new leads, messages, job applications.
- **Matching → Review queue** — partner interest first, then the strongest engine matches. *Approve intro* only when the fit is real. Approval emails both sides; neither sees the other's identity until **both** accept. Introductions expire after 14 days (reminder at day 7).
- **Messages** — reply from the team inbox (fundinglab.ca@gmail.com), then mark *replied*.
- **Leads** — fit-call requests and quick checks from the REDIP / RTRI pages, and **15-minute meeting** requests from service pages (with the visitor's preferred time). Call or email within one business day to confirm, then set the status.
- **Service requests** — every service is quote-based. Read the requirements, enter the **Quote (CAD)** and set status to *quote sent*: the business then sees a **Pay now** button on their Services page.

## Weekly

- **Matching → Recompute all** after approving new partners. Score = stage 30 + industry 20 + geography 15 + ticket size 20 + use of funds 10 + readiness bonus 5 (score ≥ 70). Only businesses with matching consent are scored.
- **Webinar & cohorts** — sessions are created automatically every Tuesday 8:00 AM PT for 8 weeks ahead. Before each session add the **join URL** (it's emailed to registrants only, never shown publicly). After it, add the **replay URL** (members only) — the follow-up email goes out automatically.
- **Partners** — approve or decline applications. Approval emails the partner. Recruiters, lawyers, CPAs and other service partners are matched on use of funds.
- **Sharing investor snapshots** — only admins set a business's visibility and create share links: **Businesses → (business) → Sharing**. Choose Link-only (or Partners, if the business consented), create a link per recipient, copy it once, and revoke it when done. Views are tracked per link.
- **Deal pipeline** — drag deals through New → Introduced → In discussion → Diligence → Term sheet → Approved → Funded / Closed lost. Record the funded amount; the success fee calculates itself.

## Cohorts (Road to Funding)

1. **New cohort**: start date must be a **Friday**; 8 weekly sessions (8:00 AM PT) are created automatically. Set status to **open** to start selling. Seats = capacity; unpaid checkouts release their seat after 2 hours.
2. Payment is by Stripe; enrollment is confirmed by the webhook and the member gets 8 calendar invites.
3. Mark attendance in the grid (✓). Members tick their own homework (·H). Refunds: refund in Stripe — the enrollment flips to *refunded* automatically.

## Programs and featured grants

- **Programs** — *Featured only* shows REDIP and RTRI. Each page section is a JSON block: edit the text, keep the structure. Upload the guide PDF (the contact shown must be “Funding Lab Team” and the website Contact page only — no personal names, numbers or email addresses).
- **Verify every 90 days**: open the official page, check amounts, deadlines and eligibility, update, then *Mark verified*. Rows flagged amber are overdue. Sample programs are placeholders until replaced.

## Careers

Create a job (status *draft* → *open*). Applicants appear under *Applicants*; resumes open through short-lived links. Applications are deleted automatically 12 months after submission, files included.

## Site content

Team, announcements, partner logos and testimonials. Rules: bios stay “[Bio to be added]” until a real bio is supplied — never invent one. Publish logos and testimonials **only with written permission** (tick *consent on file*). Never show an individual's name, phone or personal email as a contact; the public contact is always **Funding Lab Team · fundinglab.ca@gmail.com**.

## Privacy rules to remember

- Partners never see business names, websites or documents before a mutual introduction; deal flow is anonymized and references can't be linked across partners.
- Every consent change is logged. Users can download their data and delete their account from Settings.
- **Audit log** records every change to partners, matches, deals, programs, enrollments and applications.

## If something breaks

- Emails not arriving → check `RESEND_API_KEY` and the sending domain in Resend.
- Payments not confirming → Stripe dashboard → Webhooks → check deliveries to `/api/stripe/webhook`.
- Grants lookup empty → *Overview → Grants mirror* status; rerun the ETL (see README).

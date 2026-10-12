# Funding Lab

**Every funding path. One place. Start to finish.** A funding marketplace for Canadian businesses. A business builds one profile, has its federal grant history found automatically, gets a Funding Readiness Score, and is introduced privately to vetted funders and service experts. Funding Lab admins control every introduction; partner and business identities stay hidden until both sides accept.

Stack: **Next.js 15 (App Router, Server Actions) · Supabase (Postgres, Auth, Storage, RLS) · Stripe · Resend · Tailwind CSS · next-intl**.

This repo implements **Phase 1 (MVP)** and **Phase 2 (Readiness & Applications)** of the development spec (§16). See [What's deferred](#whats-deferred-to-phase-34).

---

## Quick start (local)

Prerequisites: Node 20+, Docker, the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install
cp .env.example .env.local
supabase start          # Postgres, Auth, Storage; applies migrations + seed.sql, seed_programs.sql, seed_demo.sql
supabase status         # copy the API URL, anon key and service_role key into .env.local
npm run dev             # http://localhost:3000
```

Create an account at `/signup` (local emails appear in Inbucket at http://localhost:54324), then make yourself an admin:

```sql
update public.profiles set role = 'admin', onboarded = true where email = 'you@example.com';
```

Already have a local database from an earlier phase? Apply new migrations with `supabase migration up` (or `supabase db reset` to rebuild from scratch with seeds).

Seed data (all fictional, §17): 13 partners (one per type, incl. Recruitment Partner), 5 demo businesses Idea → Exit with matches and a deal, REDIP + RTRI featured pages and 18 sample programs marked "sample", 3 jobs, an open Road to Funding cohort, 8 weeks of Tuesday webinar sessions, and sample grant records. Try **Northwind Robotics Inc.** (confident match) or **Coastal Bio** (possible match) in the profile.

### Load the real grants data

```bash
npm run etl:grants:sample   # first 20,000 rows, quick check
npm run etl:grants          # full file, ~1.3M rows (10–30 min)
```

`DATABASE_URL` must be a direct or session-pooler connection (COPY doesn't work through the transaction pooler). In production it runs weekly via `.github/workflows/grants-sync.yml` (repository secret `SUPABASE_DB_URL`).

---

## What's in the box

| Area | Where |
|---|---|
| Public site: Home, About (team from DB, bios "[Bio to be added]"), Contact form → team inbox, Careers + applications, Funding Paths, Services (11 quote-based services, each with its own page: requirement form → quote, book a 15-minute meeting, Pay now for agreed quotes; Grant Writing adds trending grants by province and the Business Benefits Finder), homepage walkthrough video, Privacy, Terms | `app/page.tsx`, `app/(legal)`, `app/contact`, `app/careers`, `app/funding-paths`, `app/services` |
| Grants Hub: featured grants, Grants 101, embedded ISED finder (with fallback), program search, grant-history teaser, fit-call booking | `app/grants`, `components/grants/*` |
| Featured grant pages (REDIP, RTRI): quick checks, calculators, guide download, fit call, admin-editable JSON blocks | `app/grants/[slug]`, `content/programs/*`, `lib/programs/*` |
| Free Funding Webinar: Tuesday 8 AM PT sessions, countdown, registration, .ics + Google Calendar, 24 h / 1 h reminders (email + opt-in SMS), follow-up, member-only replays | `app/webinar`, `app/api/webinar/[id]/ics`, `app/api/cron/hourly` |
| Road to Funding cohort: curriculum, seats, waitlist, intake, Stripe checkout ($499 CAD + optional Stripe Tax), webhook enrollment with 8 calendar invites, member space (sessions, homework, discussion) | `app/road-to-funding`, `app/app/cohort`, `app/api/stripe/webhook` |
| Readiness assessment: 21 questions, 6 weighted pillars, visitor teaser → full report after signup (answers carried over) | `app/assessment`, `app/app/assessment`, `lib/assessment.ts` |
| Auth & onboarding: email + password, magic link, Google, LinkedIn (OIDC), password reset, one-time onboarding | `app/signup`, `app/login`, `app/onboarding`, `app/auth/*` |
| Business app: dashboard (journey, readiness, verified grants, introductions, webinar, cohort offer, recommended services, completeness checklist), 6-step profile with real-time company search of Government of Canada grant records (search.open.canada.ca, live) plus the local mirror, introductions, investor snapshot with written summary (contact details confirmed first), services + Pay now, settings (consents, data export, account deletion) | `app/app/*`, `components/profile/*` |
| Partner app: application with role-specific fields (13 types) + confidentiality commitment, anonymized deal flow (Interested / Pass), introductions, profile, membership | `app/partners/join`, `app/partner/*` |
| Admin: KPIs + funnel, matching (per business + review queue), pipeline (8 stages), businesses (per-business page with visibility and tracked share links — admin-only), partner approvals, service requests, leads, messages, webinar & cohorts (sessions, enrollments, attendance), programs CMS (JSON blocks, guide PDFs, re-verification), careers (jobs, applicants, signed resume links), site content, audit log, CSV exports, admin guide | `app/admin/*` |
| Funding roadmap + capital stack planner: rules engine by stage, need and preference (Now / Next / Later, mark done); drag-in stack builder with blended cost of capital, founder dilution and a stacking-limit warning | `app/app/roadmap`, `lib/roadmap.ts`, `components/app/stack-builder.tsx` |
| Calculators: dilution (with option pool), loan repayment + DSCR, grant cost share (cap, other government funding, stacking limit), runway — every field has an explainer | `app/app/calculators`, `lib/funding-calculators.ts` |
| Grant Intelligence: every active program scored against the profile with "Why you match" / "What might disqualify you", filters (level, province, type, industry, open now, closing soon, saved), save + deadline alerts 30 / 14 / 3 days before close (email; SMS if opted in), program detail with eligible expenses, required documents, Start application and Get a Grant Writer, compact ISED finder | `app/app/grants`, `lib/programs/match.ts`, `app/api/cron/hourly` |
| Application Center: Kanban (Planning → Drafting → Under Review → Submitted → Approved / Declined), checklists built from the program's required documents and linked to data room files, decline reason → specific fixes + 3 alternative programs, approval → funding history row + claim / report / payment obligations (in Postgres, once), expert-review upsell | `app/app/applications`, `lib/applications.ts`, `fl_application_status()` |
| Prep Studio: completeness per item; guided 11-section business plan (print to PDF); 12-slide pitch outline; 3-statement financial model template; cap table editor with ownership chart and CSV export; lender-ready loan package; data room with 7 standard folders, expected-file checklists, versions, email invitations with expiry and a download toggle, PDF previews watermarked with viewer email + date, and per-document view analytics | `app/app/prep/*`, `app/data-room/[token]`, `app/api/data-room/*`, `lib/prep.ts`, `lib/watermark.ts` |
| Plans: Free / Starter / Growth / Pro with feature gates and upgrade cards, /pricing, Stripe Checkout subscriptions + Customer Portal, webhook-synced status, Growth free during a cohort, admin comps, Revenue & plans page | `lib/plans.ts`, `app/pricing`, `app/api/stripe/webhook`, `app/admin/revenue` |
| Dashboard (Phase 2 cards): capital stack progress, active applications, deadlines in the next 30 days, top 3 recommended programs | `app/app/page.tsx` |
| Email notifications outbox → Resend | `fl_notify()` in SQL, `app/api/cron/notifications`, `lib/email.ts` |
| Database: schema, RLS, RPCs, storage buckets, grants mirror | `supabase/migrations/*` |
| i18n: chrome strings (brand, CTA, consent, nav, footer) in `messages/en.json` via next-intl | `messages/`, `i18n/request.ts` |

---

## Architecture notes

### Grant history lookup

The open.canada.ca CKAN full-text search on the Grants and Contributions resource times out, and fuzzy matching can't be done there, so Funding Lab keeps a mirror:

1. **ETL** (`scripts/etl/grants-sync.ts`) streams the published CSV into a staging table with `COPY`.
2. **`fl_promote_grants()`** keeps only the latest amendment per agreement, drops individuals (`recipient_type = 'P'`), and upserts into `grants_mirror`.
3. **`fl_normalize_name()`** strips accents, punctuation and legal suffixes; stored in generated columns with `pg_trgm` GIN indexes. `lib/grants/normalize.ts` mirrors it (both tested).
4. **`fl_grant_lookup()`** returns candidates by exact name, CRA business number or trigram similarity ≥ 0.55; **`classifyLookup()`** shows grants only on a confident match, "Possible matches — is this you?" otherwise, nothing when implausible.
5. On save the server **re-derives** the confirmed entity's grants; the browser never supplies amounts.
6. The public teaser (`fl_grant_teaser`) returns only a count, only for an exact single-entity match.

### Privacy model (enforced in Postgres, not just the UI)

- Businesses can't read `partners` or `matches`. `fl_my_introductions()` shows only the partner **type**, region and why it fits until **both** sides accept; then name and contacts.
- Partners can't read `businesses`. Deal flow (`fl_partner_deal_flow()`) is anonymized: industry, province, stage, amount, use of funds, readiness and a one-liner with the company's name, legal name and domain stripped (`fl_anon_one_liner`). References are per-partner HMACs, so two partners can't correlate the same business. Passing hides an item without revealing its id.
- Introductions are approved by an admin, expire after 14 days (reminder at day 7), and only a mutual opt-in creates the deal.
- Self-signup never creates an admin; partners can't change their own status, tier or fees; cohort members can tick homework but never mark attendance.
- Documents and resumes live in private buckets; resumes are served via 5-minute signed URLs to admins only. Job applications are purged with their files after 12 months.
- Every consent change is logged (`consents`); users can export their data (`/api/me/export`) and delete their account.
- Sensitive tables write to `audit_log`.
- Public contact anywhere on the site and in PDFs: **Funding Lab Team · fundinglab.ca@gmail.com** — no individual names or phone numbers.
- CSP limits scripts to the site and Cloudflare Turnstile, and frames to Turnstile and the ISED finder.

### Matching

`lib/matching/score.ts` (unit-tested) scores 0–100 per spec §9:

| Factor | Points |
|---|---|
| Stage | 30 |
| Industry | 20 |
| Geography | 15 |
| Ticket size vs. cheque / loan range (service partners: fit) | 20 |
| Use-of-funds signal | 10 |
| Readiness bonus (score ≥ 70) | 5 |

Use-of-funds signals route to service partners (IP → lawyer, hiring → grant writer and recruiter, R&D → IRAP/SR&ED). Admins run **Recompute all** (or per business), review the queue — partner "Interested" signals first — and **Approve intro**.

### Readiness score

The assessment score (6 pillars: Business Model 20, Traction 20, Financials 20, Team 15, Documentation 15, Compliance 10) becomes the business's readiness score once taken; before that the dashboard shows an estimate from the profile. Profile completeness is tracked separately (11-item checklist).

---

## Cron jobs

| Schedule | Route | Does |
|---|---|---|
| every 5 min | `/api/cron/notifications` | Drains the `notifications` outbox to email (introductions, approvals, etc.) |
| hourly (:07) | `/api/cron/hourly` | Keeps 8 weeks of Tuesday webinar sessions; 24 h / 1 h reminders and post-webinar follow-up; expires introductions and sends day-7 reminders; releases unpaid cohort seats after 2 h; purges job applications past retention (with files); saved-program deadline alerts 30 / 14 / 3 days before close (Starter and up) |

Both are scheduled by `.github/workflows/cron.yml` (Vercel Hobby only allows daily crons) and require `Authorization: Bearer $CRON_SECRET`. Set repository secret `CRON_SECRET` (same value as Vercel) and repository variable `APP_URL`. If `pg_cron` is enabled in Supabase, the migration also schedules webinar session creation in the database.

## Stripe

1. Webhook endpoint `https://YOUR_DOMAIN/api/stripe/webhook` with events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.
2. Cohort price comes from the cohort row (`price_cad`, default $499 CAD) or an optional `stripe_price_id`. Promotion codes are enabled at checkout.
3. Set `STRIPE_AUTOMATIC_TAX=true` after configuring Stripe Tax to collect GST/HST/PST.
4. Business plans: create three recurring CAD prices and set `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_PRO`. Turn on the Customer Portal (Settings → Billing → Customer portal) with plan switching and cancellation. Until the prices are set, /pricing shows a "contact us" message and admins can comp plans.
5. Optional partner membership prices: `STRIPE_PRICE_PARTNER_PRO`, `STRIPE_PRICE_PARTNER_PREMIER`.
6. Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Deploy

1. Create a Supabase project in **ca-central-1**, then `supabase link` and `supabase db push` (seeds are local-only; don't load `seed_demo.sql` in production).
2. Auth → Providers: enable Google and **LinkedIn (OIDC)**; add `https://YOUR_DOMAIN/auth/callback` to redirect URLs. Keep email confirmation on.
3. Deploy to Vercel; set every variable in `.env.example`.
4. Configure Stripe (above) and Resend (verify the sending domain for `EMAIL_FROM`).
5. Optional: Cloudflare Turnstile keys, Twilio for SMS reminders.
6. Run the grants sync once from the Actions tab.
7. Sign up, promote yourself to admin (SQL above), then follow `docs/admin-guide.md` (also at `/admin/guide`).

---

## Testing

```bash
npm run typecheck
npm test     # matching formula, readiness assessment, calculators, completeness, grant classification, normalization, admin input whitelist, time zones,
             # roadmap rules, capital stack, program matcher, deadline alerts, plan gates, checklists, cap table, PDF watermark
# Database (scratch Postgres with Supabase objects stubbed):
for f in supabase/tests/supabase_stubs.sql supabase/migrations/*.sql supabase/seed.sql supabase/seed_programs.sql \
         supabase/seed_demo.sql supabase/tests/smoke.sql supabase/tests/rls_privacy.sql supabase/tests/phase2.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"; done
```

**RLS privacy suite** (`supabase/tests/rls_privacy.sql`, Acceptance Criteria 4 & 5) proves, as real `anon` / `authenticated` roles:
- visitors can't read partners, businesses, matches, applications, messages, leads or webinar join links;
- businesses can't query partners, criteria or matches, or use partner RPCs;
- partners see consented businesses only anonymized, with per-partner refs that can't be correlated, and no identity columns;
- identities on both sides stay hidden after admin approval and are released only on mutual acceptance;
- name/domain stripping, Pass, cohort attendance rules and 14-day expiry.

**Phase 2 suite** (`supabase/tests/phase2.sql`): approval creates funding history and obligations exactly once and the client can't set the link; owners can't read or write another business's applications, obligations, documents or data room invitations; owners can't grant themselves a plan; data room tokens are server-generated; viewers see only latest versions and never storage paths; downloads respect the toggle; access expires and revocation works (Acceptance Criterion 8); cohort members get Growth.

CI (`.github/workflows/ci.yml`) runs typecheck, a seed-sync check, unit tests, `next build`, and every migration + seed + both SQL suites on Postgres 15.

---

## What's deferred to Phase 3–4

Per spec §16: deal rooms, offer explainer, closing checklist, post-funding hub (obligations calendar and reminders, claims manager, investor updates), bridge financing flow, Next Round Engine, AI copilot and AI drafting (business plan and application answers), learn library, events, French localization (strings are ready in `messages/`), business team members, admin impersonation.

Phase 2 notes: Prep Studio completeness is shown per item but doesn't change the assessment-based readiness score; Growth's "priority matching" (§11) isn't implemented yet; obligations are created on approval but reminders and the calendar arrive with the Post-Funding Hub; the loan package and business plan use print-to-PDF.

Stack deviations to revisit: plain Tailwind components instead of shadcn/ui, server actions instead of React Hook Form, CSS bars instead of Recharts, plain-text emails instead of React Email, print-to-PDF instead of `@react-pdf/renderer`, no PostHog/Sentry yet, in-memory rate limiting (use Upstash/Redis for multi-instance).

## Before launch

- **Securities:** have BC securities counsel review the success-fee model on angel, VC and PE introductions; the disclaimer is not a safe harbour.
- **Legal copy:** Privacy Policy, Terms and the cohort refund policy are drafts.
- **Programs:** replace the 18 sample programs with verified ones; re-verify REDIP and RTRI against the official pages.
- **Content:** add the team in `/admin/content` (the local seed lists the founders and advisors from the spec); bios stay "[Bio to be added]" until supplied; testimonials and partner logos stay hidden until added with written consent.
- **Logo:** get an SVG master of the supplied PNG.
- **Data licence:** grant data is under the Open Government Licence – Canada; attribution appears under every result.

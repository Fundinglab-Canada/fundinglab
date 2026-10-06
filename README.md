# Funding Lab

**Every funding path. One place.** A funding marketplace for Canadian businesses. A business builds one profile, sees where it stands in its funding journey, has its federal grant history found automatically, and is introduced privately to vetted funders and service experts. Funding Lab admins control every match; partner identities are never public.

Stack: **Next.js 15 (App Router, Server Actions) · Supabase (Postgres, Auth, Storage, RLS) · Stripe · Tailwind CSS**.

---

## Quick start (local)

Prerequisites: Node 20+, Docker, the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install
cp .env.example .env.local
supabase start                    # Postgres, Auth, Storage on localhost; applies migrations + seed.sql
supabase status                   # copy the API URL, anon key and service_role key into .env.local
npm run dev                       # http://localhost:3000
```

Sign in with an email link (local emails appear in Inbucket at http://localhost:54324), then make yourself an admin:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

The seed includes six sample partners and three sample grant records, so try business names such as **Northwind Robotics Inc.** (confident match) or **Coastal Bio** (possible match).

### Load the real grants data

```bash
npm run etl:grants:sample         # first 20,000 rows, quick check
npm run etl:grants                # full ~2.3 GB file, about 1.3M rows (10–30 min)
```

The ETL needs `DATABASE_URL` pointing at a direct or session-pooler connection (COPY does not work through the transaction pooler). In production it runs weekly via `.github/workflows/grants-sync.yml`; add the `SUPABASE_DB_URL` repository secret.

---

## What's in the box

| Area | Where |
|---|---|
| Public site: home, funding paths, services, become a partner, about, contact, privacy, terms | `app/page.tsx`, `app/paths`, `app/services`, `app/partners/apply`, `app/(legal)/*` |
| Auth: email magic link, Google, LinkedIn (OIDC) | `app/login`, `app/auth/*`, `middleware.ts` |
| Five-step business profile with save and resume, live readiness summary | `app/profile`, `components/profile/wizard.tsx` |
| Federal grant lookup on business-name blur | `components/profile/grant-lookup.tsx`, `app/api/grants/lookup`, `lib/grants/*` |
| Funding journey dashboard: journey bar, readiness score, recommended paths, introductions, upsells | `app/dashboard` |
| Investor snapshot, visibility control, tracked share links (password, expiry, view log), print to PDF | `app/snapshot`, `app/b/[slug]`, `components/snapshot.tsx` |
| Partner application (12 partner types with role-specific fields), partner dashboard, membership tiers | `app/partners/apply`, `app/partner/*`, `lib/partners/*` |
| Admin console: overview and revenue, match suggestions, Kanban deal pipeline, businesses, partner approvals, service orders, CSV export | `app/admin/*`, `app/api/admin/export/[kind]` |
| Stripe checkout (service deposits, partner subscriptions) and webhook | `app/services/actions.ts`, `app/partner/profile/actions.ts`, `app/api/stripe/webhook` |
| Email notifications outbox → Resend | `fl_notify()` in SQL, `app/api/cron/notifications`, `lib/email.ts`, `vercel.json` |
| Database: schema, RLS, RPCs, storage, grants mirror | `supabase/migrations/*` |

---

## Architecture notes

### Grant history lookup

The open.canada.ca CKAN `datastore_search` full-text query on the Grants and Contributions resource (`1d15a62f-5656-49ad-8c88-f40ce689d831`, ~1.3M rows) times out (HTTP 409). A live call on every name blur is not dependable, and fuzzy matching can't be done there. So Funding Lab keeps its own mirror:

1. **ETL** (`scripts/etl/grants-sync.ts`) streams the published CSV into an unlogged staging table with `COPY`.
2. **`fl_promote_grants()`** keeps only the latest amendment per agreement (amendments repeat `ref_number`; summing them would inflate totals), drops individuals and sole proprietors (`recipient_type = 'P'`), and upserts into `grants_mirror`. A full refresh then deletes rows that disappeared from the source.
3. **`fl_normalize_name()`** lower-cases, strips accents, punctuation and suffixes (Inc., Ltd., Ltée, Corp.…). It is stored in generated columns with `pg_trgm` GIN indexes. `lib/grants/normalize.ts` mirrors it and both are tested.
4. **`fl_grant_lookup()`** returns candidates by exact normalized name, CRA business number (first 9 digits) or trigram similarity ≥ 0.55.
5. **`classifyLookup()`** (`lib/grants/classify.ts`) applies the spec's display rule:
   - Show grants only on a confident match: exact name, business number, or similarity ≥ 0.90 with the same city and province.
   - Otherwise show **"Possible matches — is this you?"** with confirm and reject.
   - Show nothing when there is no plausible match.
6. On save, the server **re-derives** the confirmed entity's grants from the mirror. The browser never supplies amounts. Lookups are cached for 7 days in `grant_lookups`.

### Privacy model (enforced in Postgres, not just the UI)

- Businesses can't read `partners` or `matches` at all. They see introductions only through `fl_my_introductions()`:
  - Partner name, type and bio appear after an admin approves the introduction.
  - Contact details appear only after **both** sides opt in (`fl_respond_to_match()`).
- Partners see their introductions through `fl_partner_introductions()`. Business contact details are hidden until the introduction is mutual. A partner can read a business row only if the business chose "Shared with partners", gave sharing consent, and the introduction is mutual.
- Self-signup can never create an admin. Partners can't change their own status, tier or fees (trigger-enforced).
- Share links:
  - Tokens are random, and passwords are bcrypt-hashed with `pgcrypto`.
  - The viewer's password is sent by POST and kept in a short-lived httpOnly cookie, never in the URL.
  - Viewer IPs are stored only as salted SHA-256 hashes.
- Documents live in a private bucket at `{business_id}/…`, with storage RLS tied to business ownership.
- Changes to partners, matches, deals, documents, share links and orders are written to `audit_log`.
- Fonts are self-hosted (Fontsource), so pages make no calls to third-party font servers.

### Matching

`lib/matching/score.ts` scores 0–100:

| Factor | Points |
|---|---|
| Stage | 30 |
| Industry | 25 |
| Geography | 15 |
| Amount vs. cheque or loan range | 20 |
| Use-of-funds signal | 10 |

Use-of-funds signals point to service partners. For example, IP filing points to a lawyer, hiring points to a grant writer for wage subsidies, and R&D points to IRAP and SR&ED.

Admins click **Recompute suggestions**, review the ranked list, and **Approve intro**. Approving calls `fl_approve_match()`, which notifies both sides and opens a deal card at "Introduced". Mutual opt-in moves the deal to "In Discussion". The commission is a generated column, earned only when a deal is Funded.

---

## Testing

```bash
npm run typecheck
npm test                          # matching, readiness, grant classification, normalization, CSV safety
psql "$DATABASE_URL" -f supabase/tests/smoke.sql   # end-to-end DB test on a scratch database (after migrations + seed)
```

CI (`.github/workflows/ci.yml`) runs typecheck, unit tests, `next build`, and applies every migration plus the smoke test on plain Postgres 15. Supabase-managed objects are stubbed in `supabase/tests/supabase_stubs.sql`.

The smoke test covers:
- signup roles
- amendment dedupe and the exclusion of individuals
- exact, fuzzy and no-match lookups
- RLS hiding partners from businesses
- password-protected share links
- admin approval
- contact release only after mutual opt-in
- partner self-approval being blocked
- commission math

## Deploy

1. Create a Supabase project, then run `supabase link` and `supabase db push`.
2. In Supabase **Auth → Providers**, enable Google and **LinkedIn (OIDC)**. Add `https://YOUR_DOMAIN/auth/callback` to the redirect URLs.
3. Deploy to Vercel and set every variable in `.env.example`. `vercel.json` schedules the notifications cron, so set `CRON_SECRET`.
4. Stripe:
   - Add a webhook to `https://YOUR_DOMAIN/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `customer.subscription.deleted`.
   - Create recurring prices for the partner tiers and set `STRIPE_PRICE_PARTNER_PRO` and `STRIPE_PRICE_PARTNER_PREMIER`.
5. Run the grants sync once by hand from the Actions tab, then leave it on the weekly schedule.

## Before launch

- **Securities:** have BC securities counsel review the success-fee model on angel, VC and PE introductions. Tracking commission on funded rounds may trigger exempt-market dealer or finder rules. The "Introductions only" disclaimer is not a safe harbour on its own.
- **Legal copy:** the Privacy Policy and Terms pages are drafts and are marked as such.
- **Testimonials:** the home page uses sample testimonials and a sample ledger. Replace them with consented ones.
- **Logo:** the supplied logo is a raster PNG (`public/brand`). Get an SVG master for print and very large sizes.
- **Data licence:** grant data is published under the Open Government Licence – Canada. The attribution line appears under every result.

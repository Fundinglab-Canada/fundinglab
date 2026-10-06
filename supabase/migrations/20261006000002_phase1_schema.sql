-- Funding Lab — Phase 1 (spec §4–§8, §16)
-- Business profile v2, consents, site content, programs + featured grants, leads, contact inbox,
-- careers, funding webinar, Road to Funding cohorts, readiness assessments, growth services,
-- anonymized partner deal flow and identity-on-mutual introductions.

-- ---------------------------------------------------------------------------
-- Business profile v2 (6 steps) and funding history detail
-- ---------------------------------------------------------------------------
alter table public.businesses
  add column if not exists legal_structure text check (legal_structure in ('sole_prop', 'partnership', 'corporation', 'nonprofit', 'coop')),
  add column if not exists incorporation_province char(2),
  add column if not exists naics_code text,
  add column if not exists employees integer check (employees >= 0),
  add column if not exists revenue_band text check (revenue_band in ('pre_revenue', 'under_100k', '100k_500k', '500k_1m', '1m_5m', '5m_20m', 'over_20m')),
  add column if not exists ownership_tags text[] not null default '{}',
  add column if not exists description text,
  add column if not exists logo_path text,
  add column if not exists funding_preference text check (funding_preference in ('dilutive', 'non_dilutive', 'either')),
  add column if not exists revenue_12m numeric(14,2),
  add column if not exists growth_rate_pct numeric(7,2),
  add column if not exists customers integer,
  add column if not exists key_metrics jsonb not null default '[]'::jsonb,
  add column if not exists team jsonb not null default '[]'::jsonb,
  add column if not exists profile_completeness smallint not null default 0 check (profile_completeness between 0 and 100);

alter table public.businesses drop constraint if exists businesses_profile_step_check;
alter table public.businesses add constraint businesses_profile_step_check check (profile_step between 1 and 7);

alter table public.funding_history
  add column if not exists status text not null default 'received' check (status in ('received', 'active', 'repaid', 'closed')),
  add column if not exists provider_name text;

-- Consent records (PIPEDA): one row per grant/withdrawal, newest wins.
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  consent_type text not null check (consent_type in ('share_with_partners', 'matching', 'marketing', 'ai_processing', 'sms')),
  granted boolean not null,
  granted_at timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id, consent_type, granted_at desc);
alter table public.consents enable row level security;
create policy consents_self on public.consents for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy consents_admin on public.consents for select using (public.is_admin());

alter table public.profiles
  add column if not exists sms_opt_in boolean not null default false,
  add column if not exists onboarded boolean not null default false;

-- ---------------------------------------------------------------------------
-- Site content managed in /admin/content (sections stay hidden until content exists)
-- ---------------------------------------------------------------------------
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null,
  member_group text not null check (member_group in ('founder', 'advisor', 'team')),
  bio text,
  photo_url text,
  linkedin_url text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.partner_logos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  attribution text not null,
  sort_order integer not null default 0,
  published boolean not null default false,
  consent_on_file boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  href text,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.site_content (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
create policy site_content_public on public.site_content for select using (true);
create policy site_content_admin on public.site_content for all using (public.is_admin()) with check (public.is_admin());

create trigger team_members_updated before update on public.team_members for each row execute function public.set_updated_at();

alter table public.team_members enable row level security;
alter table public.partner_logos enable row level security;
alter table public.testimonials enable row level security;
alter table public.announcements enable row level security;
create policy team_public on public.team_members for select using (published or public.is_admin());
create policy team_admin on public.team_members for all using (public.is_admin()) with check (public.is_admin());
create policy logos_public on public.partner_logos for select using (published or public.is_admin());
create policy logos_admin on public.partner_logos for all using (public.is_admin()) with check (public.is_admin());
create policy testimonials_public on public.testimonials for select using ((published and consent_on_file) or public.is_admin());
create policy testimonials_admin on public.testimonials for all using (public.is_admin()) with check (public.is_admin());
create policy announcements_public on public.announcements for select using (
  (active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or public.is_admin());
create policy announcements_admin on public.announcements for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Programs (grant / funding program database) + featured grant pages
-- ---------------------------------------------------------------------------
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  funder text not null,
  level text not null check (level in ('federal', 'provincial', 'regional', 'municipal')),
  province char(2),
  type text not null check (type in ('grant', 'contribution', 'loan', 'tax_credit', 'wage_subsidy', 'equity', 'repayable')),
  summary text,
  industries text[] not null default '{}',
  stages text[] not null default '{}',
  min_amount numeric(14,2),
  max_amount numeric(14,2),
  cost_share_pct numeric(5,2),
  eligible_expenses text[] not null default '{}',
  eligibility_rules jsonb not null default '{}'::jsonb,
  stacking_limit_pct numeric(5,2),
  intake_open date,
  intake_close timestamptz,
  rolling boolean not null default false,
  required_docs text[] not null default '{}',
  official_url text,
  last_verified_at date,
  verified_by text,
  active boolean not null default true,
  is_sample boolean not null default false,
  -- Featured grant page content (§4G). Admin edits each block as JSON in /admin/programs.
  is_featured boolean not null default false,
  featured_order integer,
  badge text,
  headline text,
  subheadline text,
  status_text text,
  close_at timestamptz,
  calculator text check (calculator in ('redip', 'rtri')),
  content jsonb not null default '{}'::jsonb,
  official_contact text,
  disclaimer text,
  guide_pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index programs_featured_idx on public.programs (is_featured, featured_order);
create index programs_search_idx on public.programs using gin (to_tsvector('english', name || ' ' || coalesce(summary, '') || ' ' || funder));
create trigger programs_updated before update on public.programs for each row execute function public.set_updated_at();
alter table public.programs enable row level security;
create policy programs_public on public.programs for select using (active or public.is_admin());
create policy programs_admin on public.programs for all using (public.is_admin()) with check (public.is_admin());

-- Downloadable program guides (email-gated, served by signed URL). PDFs must show only the team contact.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guides', 'guides', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;
create policy guides_bucket_admin on storage.objects for all to authenticated
  using (bucket_id = 'guides' and public.is_admin()) with check (bucket_id = 'guides' and public.is_admin());

create table public.saved_programs (
  business_id uuid not null references public.businesses (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  alert_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (business_id, program_id)
);
alter table public.saved_programs enable row level security;
create policy saved_programs_owner on public.saved_programs for all
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- ---------------------------------------------------------------------------
-- Leads (fit calls, quick checks, grant teasers, guide downloads) and contact inbox
-- Written by trusted server actions after bot checks; read by admins and by the lead's own user.
-- ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('fit_call', 'quick_check', 'grant_teaser', 'assessment', 'guide_download', 'service_quote')),
  program_id uuid references public.programs (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  business_id uuid references public.businesses (id) on delete set null,
  name text,
  email text,
  phone text,
  business_name text,
  city text,
  project_description text,
  answers jsonb not null default '{}'::jsonb,
  score integer,
  result_band text,
  source_page text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'converted', 'closed')),
  admin_notes text,
  created_at timestamptz not null default now()
);
create index leads_status_idx on public.leads (status, created_at desc);
alter table public.leads enable row level security;
create policy leads_admin on public.leads for all using (public.is_admin()) with check (public.is_admin());
create policy leads_self_read on public.leads for select using (user_id = auth.uid());

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  business_name text,
  role text,
  topic text,
  message text not null check (char_length(message) <= 2000),
  status text not null default 'new' check (status in ('new', 'replied', 'closed')),
  admin_notes text,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);
alter table public.contact_messages enable row level security;
create policy contact_admin on public.contact_messages for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Careers (§4C)
-- ---------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  department text not null,
  job_type text not null check (job_type in ('full_time', 'part_time', 'contract', 'internship', 'volunteer', 'ambassador')),
  location text not null,
  remote_option text not null default 'remote' check (remote_option in ('onsite', 'hybrid', 'remote')),
  compensation_text text,
  description text not null default '',
  responsibilities text[] not null default '{}',
  requirements text[] not null default '{}',
  nice_to_have text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  posted_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger jobs_updated before update on public.jobs for each row execute function public.set_updated_at();
alter table public.jobs enable row level security;
create policy jobs_public on public.jobs for select using (status = 'open' or public.is_admin());
create policy jobs_admin on public.jobs for all using (public.is_admin()) with check (public.is_admin());

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  city text,
  province char(2),
  linkedin_url text,
  portfolio_url text,
  resume_path text not null,
  cover_letter_path text,
  cover_letter_text text,
  why_us text check (char_length(why_us) <= 1000),
  start_date date,
  work_type text,
  work_eligible boolean,
  source text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'interview', 'offer', 'hired', 'rejected', 'withdrawn')),
  rating smallint check (rating between 1 and 5),
  admin_notes text,
  consent_at timestamptz not null default now(),
  retain_until date not null default (now() + interval '12 months')::date,
  created_at timestamptz not null default now()
);
create index job_applications_status_idx on public.job_applications (status, created_at desc);
alter table public.job_applications enable row level security;
create policy job_applications_admin on public.job_applications for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('careers', 'careers', false, 10485760,
        array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;
create policy careers_bucket_admin on storage.objects for select to authenticated
  using (bucket_id = 'careers' and public.is_admin());

-- Returns storage paths of applications past their 12-month retention and deletes the rows (PIPEDA).
-- The cron route removes the files through the Storage API.
create or replace function public.fl_purge_expired_applications()
returns table (resume_path text, cover_letter_path text)
language sql security definer set search_path = public as $$
  delete from public.job_applications where retain_until < current_date
  returning resume_path, cover_letter_path;
$$;
revoke all on function public.fl_purge_expired_applications() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Funding Webinar (§4D-A): every Tuesday 08:00 America/Vancouver
-- ---------------------------------------------------------------------------
create table public.webinar_sessions (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null unique,
  duration_minutes integer not null default 60,
  topic text not null default 'Which funding fits your business? Grants, loans, angels and VCs explained',
  description text,
  speakers text[] not null default '{}',
  join_url text,
  replay_url text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'completed', 'cancelled')),
  capacity integer,
  created_at timestamptz not null default now()
);
create table public.webinar_registrations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.webinar_sessions (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  business_name text,
  stage text,
  question text,
  sms_opt_in boolean not null default false,
  attended boolean,
  source text,
  reminded_24h_at timestamptz,
  reminded_1h_at timestamptz,
  followup_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, email)
);
alter table public.webinar_sessions enable row level security;
alter table public.webinar_registrations enable row level security;
-- Join links are only emailed to registrants; the public view omits them.
create policy webinar_sessions_admin on public.webinar_sessions for all using (public.is_admin()) with check (public.is_admin());
create policy webinar_registrations_admin on public.webinar_registrations for all using (public.is_admin()) with check (public.is_admin());
create policy webinar_registrations_self on public.webinar_registrations for select using (user_id = auth.uid());

create or replace view public.webinar_sessions_public with (security_invoker = false) as
  select id, starts_at, duration_minutes, topic, description, speakers, status,
         (replay_url is not null) as has_replay
  from public.webinar_sessions
  where status <> 'cancelled';
grant select on public.webinar_sessions_public to anon, authenticated;

-- Creates the next N Tuesday 08:00 PT sessions (DST-aware). Called by pg_cron and the hourly cron route.
create or replace function public.fl_ensure_webinar_sessions(p_weeks integer default 8)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_local_today date := (now() at time zone 'America/Vancouver')::date;
  v_first date := v_local_today + ((2 - extract(isodow from v_local_today)::int + 7) % 7);
  v_created integer := 0;
  v_start timestamptz;
begin
  for i in 0 .. greatest(1, p_weeks) - 1 loop
    v_start := ((v_first + i * 7)::timestamp + time '08:00') at time zone 'America/Vancouver';
    if v_start > now() then
      insert into public.webinar_sessions (starts_at) values (v_start) on conflict (starts_at) do nothing;
      if found then v_created := v_created + 1; end if;
    end if;
  end loop;
  return v_created;
end $$;
revoke all on function public.fl_ensure_webinar_sessions(integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Road to Funding cohorts (§4D-B): 8 Fridays at 08:00 PT, $499 CAD
-- ---------------------------------------------------------------------------
create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null check (extract(isodow from start_date) = 5),
  end_date date generated always as (start_date + 49) stored,
  class_time time not null default '08:00',
  price_cad numeric(10,2) not null default 499,
  stripe_price_id text,
  capacity integer not null default 25 check (capacity > 0),
  registration_deadline date,
  join_url text,
  status text not null default 'draft' check (status in ('draft', 'open', 'full', 'in_progress', 'completed')),
  created_at timestamptz not null default now()
);
create table public.cohort_sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  week_number smallint not null check (week_number between 1 and 8),
  starts_at timestamptz not null,
  topic text not null,
  materials jsonb not null default '[]'::jsonb,
  replay_url text,
  homework jsonb not null default '[]'::jsonb,
  unique (cohort_id, week_number)
);
create table public.cohort_enrollments (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete restrict,
  business_id uuid references public.businesses (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'enrolled', 'waitlisted', 'refunded', 'transferred', 'completed', 'cancelled')),
  stripe_checkout_session_id text unique,
  stripe_payment_id text,
  amount_paid numeric(10,2),
  coupon_code text,
  intake jsonb not null default '{}'::jsonb,
  certificate_url text,
  created_at timestamptz not null default now(),
  unique (cohort_id, user_id)
);
create table public.cohort_attendance (
  session_id uuid not null references public.cohort_sessions (id) on delete cascade,
  enrollment_id uuid not null references public.cohort_enrollments (id) on delete cascade,
  attended boolean not null default false,
  homework_done boolean not null default false,
  primary key (session_id, enrollment_id)
);
create table public.cohort_posts (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- Default curriculum (admin-editable per cohort after creation).
create or replace function public.fl_cohort_default_topic(w integer) returns text
language sql immutable as $$
  select (array[
    'Know your stage & funding options',
    'Build your funding roadmap & capital stack',
    'Grants, tax credits & wage subsidies',
    'Loans & lender-ready financials',
    'Pitch deck & business plan',
    'Data room & due diligence',
    'Investors: angels, VCs, crowdfunding & term sheets',
    'Pitch day & next steps'])[w];
$$;

create or replace function public.fl_create_cohort_sessions() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.cohort_sessions (cohort_id, week_number, starts_at, topic)
  select new.id, w, ((new.start_date + (w - 1) * 7)::timestamp + new.class_time) at time zone 'America/Vancouver',
         public.fl_cohort_default_topic(w)
  from generate_series(1, 8) w
  on conflict do nothing;
  return new;
end $$;
create trigger cohorts_sessions after insert on public.cohorts for each row execute function public.fl_create_cohort_sessions();

create or replace function public.is_cohort_member(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cohort_enrollments e
                 where e.cohort_id = c and e.user_id = auth.uid() and e.status in ('enrolled', 'completed'));
$$;

create or replace function public.fl_cohort_seats(p_cohort uuid)
returns table (capacity integer, enrolled integer, seats_left integer)
language sql stable security definer set search_path = public as $$
  select c.capacity,
         (select count(*)::int from public.cohort_enrollments e where e.cohort_id = c.id and e.status in ('enrolled', 'completed', 'pending_payment')),
         greatest(0, c.capacity - (select count(*)::int from public.cohort_enrollments e where e.cohort_id = c.id and e.status in ('enrolled', 'completed', 'pending_payment')))
  from public.cohorts c where c.id = p_cohort;
$$;
grant execute on function public.fl_cohort_seats(uuid) to anon, authenticated;

alter table public.cohorts enable row level security;
alter table public.cohort_sessions enable row level security;
alter table public.cohort_enrollments enable row level security;
alter table public.cohort_attendance enable row level security;
alter table public.cohort_posts enable row level security;
create policy cohorts_public on public.cohorts for select using (status <> 'draft' or public.is_admin());
create policy cohorts_admin on public.cohorts for all using (public.is_admin()) with check (public.is_admin());
-- Sessions (topics, dates) are public; materials/replays/join links come through the member-only view below.
create policy cohort_sessions_admin on public.cohort_sessions for all using (public.is_admin()) with check (public.is_admin());
create policy cohort_sessions_member on public.cohort_sessions for select using (public.is_cohort_member(cohort_id));
create policy enrollments_self_read on public.cohort_enrollments for select using (user_id = auth.uid());
create policy enrollments_admin on public.cohort_enrollments for all using (public.is_admin()) with check (public.is_admin());
create policy attendance_self on public.cohort_attendance for select using (
  exists (select 1 from public.cohort_enrollments e where e.id = enrollment_id and e.user_id = auth.uid()));
create policy attendance_self_homework on public.cohort_attendance for update using (
  exists (select 1 from public.cohort_enrollments e where e.id = enrollment_id and e.user_id = auth.uid()));
create policy attendance_admin on public.cohort_attendance for all using (public.is_admin()) with check (public.is_admin());
create policy cohort_posts_member_read on public.cohort_posts for select using (public.is_cohort_member(cohort_id) or public.is_admin());
create policy cohort_posts_member_write on public.cohort_posts for insert with check (author_id = auth.uid() and public.is_cohort_member(cohort_id));
create policy cohort_posts_admin on public.cohort_posts for all using (public.is_admin()) with check (public.is_admin());

create or replace view public.cohort_schedule_public with (security_invoker = false) as
  select s.cohort_id, s.week_number, s.starts_at, s.topic
  from public.cohort_sessions s join public.cohorts c on c.id = s.cohort_id
  where c.status <> 'draft';
grant select on public.cohort_schedule_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Readiness assessments (§7.2)
-- ---------------------------------------------------------------------------
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  email text,
  answers jsonb not null,
  score smallint not null check (score between 0 and 100),
  band text not null,
  pillar_scores jsonb not null,
  gaps jsonb not null default '[]'::jsonb,
  recommended_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index assessments_business_idx on public.assessments (business_id, created_at desc);
alter table public.assessments enable row level security;
create policy assessments_owner on public.assessments for select using (user_id = auth.uid() or public.owns_business(business_id) or public.is_admin());
create policy assessments_owner_insert on public.assessments for insert with check (user_id = auth.uid() and (business_id is null or public.owns_business(business_id)));

-- ---------------------------------------------------------------------------
-- Services: growth services, quotes and upsell attribution (§4H)
-- ---------------------------------------------------------------------------
alter table public.service_orders
  add column if not exists details jsonb not null default '{}'::jsonb,
  add column if not exists trigger_source text,
  add column if not exists quote_amount_cad numeric(12,2),
  add column if not exists quote_file_path text,
  add column if not exists assigned_partner_id uuid references public.partners (id) on delete set null;
create policy service_orders_partner_read on public.service_orders for select using (public.owns_partner(assigned_partner_id));

-- ---------------------------------------------------------------------------
-- Matching v2 (§7.7): admin approves → partner sees anonymized opportunity → both accept →
-- identities and contacts released and the deal enters the pipeline at "introduced".
-- Unanswered introductions expire after 14 days (reminder at day 7).
-- ---------------------------------------------------------------------------
alter table public.matches
  add column if not exists source text not null default 'engine' check (source in ('engine', 'partner_interest', 'admin')),
  add column if not exists score_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists expires_at timestamptz,
  add column if not exists reminded_at timestamptz;

create or replace function public.fl_approve_match(p_match_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  m public.matches;
  v_owner uuid;
  v_partner_user uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'Match not found'; end if;
  if m.status not in ('suggested', 'declined', 'dismissed', 'expired') then return; end if;
  select owner_id into v_owner from public.businesses where id = m.business_id and consent_matching;
  if v_owner is null then raise exception 'The business has not consented to matching'; end if;
  if not exists (select 1 from public.partners where id = m.partner_id and status = 'active') then
    raise exception 'Partner is not active';
  end if;

  update public.matches
     set status = 'approved', approved_by = auth.uid(), approved_at = now(), admin_note = p_note,
         business_opt_in = null, partner_opt_in = null, expires_at = now() + interval '14 days', reminded_at = null
   where id = p_match_id;

  select user_id into v_partner_user from public.partners where id = m.partner_id;
  perform public.fl_notify(v_owner, 'introduction_proposed', jsonb_build_object('match_id', m.id));
  if v_partner_user is not null then
    perform public.fl_notify(v_partner_user, 'opportunity_curated', jsonb_build_object('match_id', m.id));
  end if;
end $$;

create or replace function public.fl_respond_to_match(p_match_id uuid, p_accept boolean)
returns public.match_status language plpgsql security definer set search_path = public as $$
declare
  m public.matches;
  is_biz boolean;
  is_partner boolean;
  v_owner uuid;
  v_partner_user uuid;
  v_type public.partner_type;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found or m.status not in ('approved', 'mutual') then raise exception 'Introduction not available'; end if;
  if m.status = 'approved' and m.expires_at is not null and m.expires_at < now() then
    update public.matches set status = 'expired' where id = m.id;
    raise exception 'This introduction has expired';
  end if;
  select owner_id into v_owner from public.businesses where id = m.business_id;
  select user_id, type into v_partner_user, v_type from public.partners where id = m.partner_id;
  is_biz := v_owner = auth.uid();
  is_partner := v_partner_user = auth.uid();
  if not (is_biz or is_partner) then raise exception 'Not your introduction'; end if;

  if is_biz then
    update public.matches set business_opt_in = p_accept, business_responded_at = now() where id = m.id;
  else
    update public.matches set partner_opt_in = p_accept, partner_responded_at = now() where id = m.id;
  end if;
  select * into m from public.matches where id = p_match_id;

  if m.business_opt_in is true and m.partner_opt_in is true then
    update public.matches set status = 'mutual' where id = m.id;
    insert into public.deals (match_id, business_id, partner_id, deal_type, status, expected_amount, commission_rate)
    select m.id, m.business_id, m.partner_id, v_type::text, 'introduced', b.amount_sought, coalesce(p.success_fee_rate, 0.03)
    from public.businesses b, public.partners p where b.id = m.business_id and p.id = m.partner_id
    on conflict (match_id) do update set status = 'introduced';
    perform public.fl_notify(v_owner, 'introduction_mutual', jsonb_build_object('match_id', m.id));
    if v_partner_user is not null then
      perform public.fl_notify(v_partner_user, 'introduction_mutual', jsonb_build_object('match_id', m.id));
    end if;
    return 'mutual';
  elsif m.business_opt_in is false or m.partner_opt_in is false then
    update public.matches set status = 'declined' where id = m.id;
    return 'declined';
  end if;
  return m.status;
end $$;

-- Businesses can follow their own deals (deals only exist after mutual opt-in).
create policy deals_business_read on public.deals for select using (public.owns_business(business_id));

-- Business view: before mutual opt-in only the partner TYPE and why it fits; identity + contact after.
drop function if exists public.fl_my_introductions(uuid);
create or replace function public.fl_my_introductions(p_business_id uuid)
returns table (
  match_id uuid, status public.match_status, approved_at timestamptz, expires_at timestamptz,
  business_opt_in boolean, partner_opt_in boolean, score smallint, reasons text[],
  partner_type public.partner_type, partner_location text,
  partner_name text, partner_company text, partner_bio text, partner_photo text,
  contact_person text, contact_email text, contact_phone text, linkedin_url text
) language sql stable security definer set search_path = public as $$
  select m.id, m.status, m.approved_at, m.expires_at, m.business_opt_in, m.partner_opt_in, m.score, m.reasons,
         p.type,
         case when m.status = 'mutual' then p.location else split_part(coalesce(p.location, ''), ',', 2) end,
         case when m.status = 'mutual' then p.display_name end,
         case when m.status = 'mutual' then p.company end,
         case when m.status = 'mutual' then p.bio end,
         case when m.status = 'mutual' then p.photo_path end,
         case when m.status = 'mutual' then p.contact_person end,
         case when m.status = 'mutual' then p.contact_email end,
         case when m.status = 'mutual' then p.contact_phone end,
         case when m.status = 'mutual' then p.linkedin_url end
  from public.matches m
  join public.partners p on p.id = m.partner_id
  where m.business_id = p_business_id
    and public.owns_business(p_business_id)
    and m.status in ('approved', 'mutual')
  order by m.approved_at desc;
$$;
grant execute on function public.fl_my_introductions(uuid) to authenticated;

-- Partner view of curated introductions: anonymized until mutual.
drop function if exists public.fl_partner_introductions();
create or replace function public.fl_partner_introductions()
returns table (
  match_id uuid, status public.match_status, score smallint, reasons text[], approved_at timestamptz, expires_at timestamptz,
  business_opt_in boolean, partner_opt_in boolean,
  industry text, province char(2), stage public.business_stage, amount_sought numeric, use_of_funds text[],
  readiness_score smallint, one_liner text,
  business_name text, business_slug text, website text, contact_name text, contact_email text, contact_phone text
) language sql stable security definer set search_path = public as $$
  select m.id, m.status, m.score, m.reasons, m.approved_at, m.expires_at, m.business_opt_in, m.partner_opt_in,
         b.industry, b.province, b.stage, b.amount_sought, b.use_of_funds, b.readiness_score, left(b.description, 160),
         case when m.status = 'mutual' then b.name end,
         case when m.status = 'mutual' then b.slug end,
         case when m.status = 'mutual' then b.website end,
         case when m.status = 'mutual' then b.contact_name end,
         case when m.status = 'mutual' then b.contact_email end,
         case when m.status = 'mutual' then b.contact_phone end
  from public.matches m
  join public.partners p on p.id = m.partner_id and p.user_id = auth.uid() and p.status = 'active'
  join public.businesses b on b.id = m.business_id
  where m.status in ('approved', 'mutual')
  order by m.approved_at desc;
$$;
grant execute on function public.fl_partner_introductions() to authenticated;

-- Anonymized deal flow (§6 RLS rules): businesses that consented to matching, no name/website/documents.
-- opportunity_ref is an opaque per-partner token, so refs can't be correlated across partners.
create or replace function public.fl_partner_deal_flow()
returns table (
  opportunity_ref text, industry text, province char(2), stage public.business_stage, amount_sought numeric,
  use_of_funds text[], readiness_score smallint, one_liner text, listed_at timestamptz, interest_status text
) language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_partner uuid;
begin
  select id into v_partner from public.partners where user_id = auth.uid() and status = 'active';
  if v_partner is null then return; end if;
  return query
  select encode(hmac(b.id::text, v_partner::text, 'sha256'), 'hex'),
         b.industry, b.province, b.stage, b.amount_sought, b.use_of_funds, b.readiness_score,
         left(b.description, 160), b.created_at,
         (select m.status::text from public.matches m where m.business_id = b.id and m.partner_id = v_partner)
  from public.businesses b
  where b.consent_matching and b.stage is not null and b.profile_step >= 4
  order by b.readiness_score desc, b.created_at desc
  limit 200;
end $$;
grant execute on function public.fl_partner_deal_flow() to authenticated;

-- Partner clicks "Express interest" on a deal-flow item → admin review queue (source = partner_interest).
create or replace function public.fl_partner_express_interest(p_ref text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_partner uuid;
  v_business uuid;
begin
  select id into v_partner from public.partners where user_id = auth.uid() and status = 'active';
  if v_partner is null then raise exception 'Only active partners can express interest'; end if;
  select b.id into v_business from public.businesses b
   where b.consent_matching and encode(hmac(b.id::text, v_partner::text, 'sha256'), 'hex') = p_ref;
  if v_business is null then raise exception 'Opportunity not found'; end if;
  insert into public.matches (business_id, partner_id, score, reasons, status, source)
  values (v_business, v_partner, 0, '{partner interest}', 'suggested', 'partner_interest')
  on conflict (business_id, partner_id) do update
    set source = 'partner_interest', status = case when public.matches.status in ('dismissed', 'expired') then 'suggested' else public.matches.status end;
end $$;
grant execute on function public.fl_partner_express_interest(text) to authenticated;

-- Expire unanswered introductions; returns those due a day-7 reminder (the cron route emails them).
create or replace function public.fl_expire_and_remind_matches()
returns table (match_id uuid, business_owner uuid, partner_user uuid)
language plpgsql security definer set search_path = public as $$
begin
  update public.matches set status = 'expired'
   where status = 'approved' and expires_at < now();
  return query
  with due as (
    update public.matches m set reminded_at = now()
     where m.status = 'approved' and m.reminded_at is null and m.approved_at < now() - interval '7 days'
       and (m.business_opt_in is null or m.partner_opt_in is null)
    returning m.id, m.business_id, m.partner_id
  )
  select d.id, b.owner_id, p.user_id from due d
  join public.businesses b on b.id = d.business_id join public.partners p on p.id = d.partner_id;
end $$;
revoke all on function public.fl_expire_and_remind_matches() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public grant-history teaser (home page / Grants Hub): only a count, only on a confident match.
-- ---------------------------------------------------------------------------
create or replace function public.fl_grant_teaser(p_name text, p_province text default null)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare
  q text := public.fl_normalize_name(p_name);
  v_count integer;
  v_entities integer;
begin
  if q is null or length(q) < 4 then return jsonb_build_object('found', false); end if;
  select count(*), count(distinct legal_norm) into v_count, v_entities
  from public.grants_mirror g
  where (g.legal_norm = q or g.operating_norm = q)
    and (p_province is null or g.recipient_province = upper(p_province));
  if v_count > 0 and v_entities = 1 then
    return jsonb_build_object('found', true, 'count', v_count);
  end if;
  return jsonb_build_object('found', false);
end $$;
grant execute on function public.fl_grant_teaser(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin impersonation log + audit for new sensitive tables
-- ---------------------------------------------------------------------------
create trigger audit_job_applications after insert or update or delete on public.job_applications
  for each row execute function public.audit_trigger();
create trigger audit_cohort_enrollments after insert or update or delete on public.cohort_enrollments
  for each row execute function public.audit_trigger();
create trigger audit_programs after insert or update or delete on public.programs
  for each row execute function public.audit_trigger();
create trigger audit_consents after insert on public.consents
  for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------------
-- pg_cron (enabled on Supabase from Dashboard → Database → Extensions). Skipped where unavailable.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('fl-webinar-sessions', '5 * * * *', 'select public.fl_ensure_webinar_sessions(8)');
  end if;
exception when others then
  raise notice 'pg_cron not scheduled: %', sqlerrm;
end $$;

select public.fl_ensure_webinar_sessions(8);

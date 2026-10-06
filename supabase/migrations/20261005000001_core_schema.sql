-- Funding Lab — core schema
-- Tables from the spec: users (profiles), businesses, funding_history, grant_lookups, partners,
-- partner_criteria, matches, deals, service_orders, share_links, documents
-- plus share_link_views, notifications and audit_log.

-- Supabase keeps extensions in the "extensions" schema; functions below include it in search_path.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('business', 'partner', 'admin');
create type public.business_stage as enum ('idea', 'preseed', 'seed', 'growth', 'expansion', 'exit');
create type public.funding_source as enum (
  'crowdfunding', 'angel', 'venture_capital', 'private_equity',
  'grant_federal', 'grant_provincial', 'business_loan', 'ipo_acquisition'
);
create type public.loan_subtype as enum (
  'bridge', 'equipment', 'receivables', 'bank_csbfp', 'bank_cala', 'bank_other', 'line_of_credit'
);
create type public.visibility as enum ('private', 'link', 'partners');
create type public.partner_type as enum (
  'crowdfunding_platform', 'angel_investor', 'venture_capital', 'private_equity',
  'grant_writer', 'lending_partner', 'ipo_expert', 'ma_expert',
  'development_expert', 'marketing_expert', 'commercial_lawyer', 'fractional_cpa'
);
create type public.partner_status as enum ('pending', 'active', 'declined', 'suspended');
create type public.match_status as enum ('suggested', 'approved', 'mutual', 'declined', 'dismissed');
create type public.deal_status as enum ('new', 'introduced', 'in_discussion', 'term_sheet', 'funded', 'closed_lost');
create type public.service_kind as enum ('data_room', 'business_plan', 'grant_writing', 'loan_consulting', 'partner_membership');
create type public.order_status as enum ('quote_requested', 'quote_sent', 'checkout_started', 'paid', 'in_progress', 'delivered', 'cancelled');
create type public.document_kind as enum ('pitch_deck', 'financials', 'business_plan', 'other');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Users (profiles linked to auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'business',
  full_name text,
  email text,
  phone text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role lookup used by RLS. security definer so policies don't recurse into profiles' own RLS.
create or replace function public.current_role_is(r public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = r);
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role_is('admin');
$$;

-- New auth user -> profile. Self-signup can only ever be 'business' or 'partner'; admins are promoted by SQL.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    case when new.raw_user_meta_data ->> 'intended_role' = 'partner' then 'partner'::public.app_role
         else 'business'::public.app_role end
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may edit their own profile but never their role.
create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for the SQL console and service-role calls, which are trusted.
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an admin can change a role';
  end if;
  return new;
end $$;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- Businesses
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique,
  name text not null,
  legal_name text,
  website text,
  business_number text,               -- CRA BN; first 9 digits used for exact grant matching
  years_in_business numeric(4,1),
  industry text,
  province char(2),
  city text,
  contact_name text,
  contact_email text,
  contact_phone text,
  annual_revenue numeric(14,2),
  stage public.business_stage,
  amount_sought numeric(14,2),
  timeline text,
  use_of_funds text[] not null default '{}',
  hire_roles text,
  use_of_funds_other text,
  profile_step smallint not null default 1 check (profile_step between 1 and 6),
  readiness_score smallint not null default 0 check (readiness_score between 0 and 100),
  visibility public.visibility not null default 'private',
  consent_matching boolean not null default false,
  consent_matching_at timestamptz,
  consent_sharing boolean not null default false,
  consent_sharing_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index businesses_owner_idx on public.businesses (owner_id);
create index businesses_stage_idx on public.businesses (stage);
create trigger businesses_updated before update on public.businesses
  for each row execute function public.set_updated_at();

create or replace function public.owns_business(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses where id = b and owner_id = auth.uid());
$$;

-- Funding history (repeatable rows; confirmed federal grants land here with grant_ref)
create table public.funding_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  source public.funding_source not null,
  loan_subtype public.loan_subtype,
  amount numeric(14,2) not null check (amount >= 0),
  year smallint check (year between 1950 and 2100),
  program_name text,
  department text,
  grant_owner_org text,
  grant_ref text,
  auto_found boolean not null default false,
  created_at timestamptz not null default now(),
  constraint loan_subtype_only_for_loans check (loan_subtype is null or source = 'business_loan'),
  unique (business_id, grant_owner_org, grant_ref)
);
create index funding_history_business_idx on public.funding_history (business_id);

-- Grant lookups: an audit + cache of every name lookup (cache key = normalized name + province + city)
create table public.grant_lookups (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  query_name text not null,
  query_norm text not null,
  province char(2),
  city text,
  outcome text not null check (outcome in ('match', 'possible', 'none')),
  result jsonb not null default '{}'::jsonb,
  confirmed_entity text,
  created_at timestamptz not null default now()
);
create index grant_lookups_cache_idx on public.grant_lookups (query_norm, province, city, created_at desc);

-- Documents (files in the private 'documents' storage bucket at {business_id}/{uuid}-{filename})
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind public.document_kind not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index documents_business_idx on public.documents (business_id);

-- ---------------------------------------------------------------------------
-- Partners (private; never visible to visitors or businesses)
-- ---------------------------------------------------------------------------
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete set null,
  type public.partner_type not null,
  status public.partner_status not null default 'pending',
  display_name text not null,         -- person or firm name shown after an approved introduction
  company text,
  contact_person text,
  contact_email text,
  contact_phone text,
  photo_path text,
  location text,
  bio text,
  linkedin_url text,
  details jsonb not null default '{}'::jsonb,  -- role-specific fields, validated by lib/partners/schemas.ts
  membership_tier text not null default 'standard' check (membership_tier in ('standard', 'pro', 'premier')),
  success_fee_rate numeric(5,4) check (success_fee_rate between 0 and 1),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partners_status_idx on public.partners (status, type);
create trigger partners_updated before update on public.partners
  for each row execute function public.set_updated_at();

create or replace function public.owns_partner(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.partners where id = p and user_id = auth.uid());
$$;

-- Only admins may change status/approval/fee fields.
create or replace function public.protect_partner_admin_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() and (
       new.status is distinct from old.status
    or new.approved_by is distinct from old.approved_by
    or new.approved_at is distinct from old.approved_at
    or new.success_fee_rate is distinct from old.success_fee_rate
    or new.membership_tier is distinct from old.membership_tier) then
    raise exception 'Only Funding Lab can change partner status, tier or fees';
  end if;
  return new;
end $$;
create trigger partners_protect before update on public.partners
  for each row execute function public.protect_partner_admin_fields();

create table public.partner_criteria (
  partner_id uuid primary key references public.partners (id) on delete cascade,
  stages public.business_stage[] not null default '{}',
  industries text[] not null default '{}',       -- empty = all industries
  provinces text[] not null default '{}',        -- empty = Canada-wide
  min_amount numeric(14,2),
  max_amount numeric(14,2),
  uses_of_funds text[] not null default '{}',    -- e.g. {'ip_patent'} for lawyers, {'hire_staff','rd'} for grant writers
  loan_types public.loan_subtype[] not null default '{}',
  updated_at timestamptz not null default now(),
  check (min_amount is null or max_amount is null or min_amount <= max_amount)
);

-- ---------------------------------------------------------------------------
-- Matching and deals
-- ---------------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  partner_id uuid not null references public.partners (id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  reasons text[] not null default '{}',
  status public.match_status not null default 'suggested',
  business_opt_in boolean,
  business_responded_at timestamptz,
  partner_opt_in boolean,
  partner_responded_at timestamptz,
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, partner_id)
);
create index matches_status_idx on public.matches (status, score desc);
create trigger matches_updated before update on public.matches
  for each row execute function public.set_updated_at();

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid unique references public.matches (id) on delete set null,
  business_id uuid not null references public.businesses (id) on delete cascade,
  partner_id uuid not null references public.partners (id) on delete cascade,
  deal_type text not null,
  status public.deal_status not null default 'new',
  position integer not null default 0,
  expected_amount numeric(14,2),
  funded_amount numeric(14,2),
  commission_rate numeric(5,4) not null default 0.03 check (commission_rate between 0 and 1),
  commission_amount numeric(14,2) generated always as (
    case when status = 'funded' then round(coalesce(funded_amount, expected_amount, 0) * commission_rate, 2) else 0 end
  ) stored,
  closed_at timestamptz,
  lost_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deals_status_idx on public.deals (status, position);
create trigger deals_updated before update on public.deals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Services / upsells
-- ---------------------------------------------------------------------------
create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete set null,
  partner_id uuid references public.partners (id) on delete set null,
  requested_by uuid references public.profiles (id) on delete set null,
  kind public.service_kind not null,
  status public.order_status not null default 'quote_requested',
  message text,
  amount numeric(12,2),
  currency char(3) not null default 'CAD',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index service_orders_status_idx on public.service_orders (status, created_at desc);
create trigger service_orders_updated before update on public.service_orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Shareable profile links
-- ---------------------------------------------------------------------------
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  token text not null unique default translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/=', '-_'),
  label text not null,
  password_hash text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index share_links_business_idx on public.share_links (business_id);

create table public.share_link_views (
  id bigserial primary key,
  share_link_id uuid not null references public.share_links (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  viewer_email text,
  ip_hash text,
  user_agent text,
  referrer text
);
create index share_link_views_link_idx on public.share_link_views (share_link_id, viewed_at desc);

-- ---------------------------------------------------------------------------
-- Notifications outbox and audit log
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles (id) on delete cascade,
  recipient_email text,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

create table public.audit_log (
  id bigserial primary key,
  actor_id uuid,
  action text not null,
  table_name text not null,
  row_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_table_idx on public.audit_log (table_name, created_at desc);

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (actor_id, action, table_name, row_id, old_data, new_data)
  values (
    auth.uid(), tg_op, tg_table_name,
    coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, null),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger audit_partners after insert or update or delete on public.partners
  for each row execute function public.audit_trigger();
create trigger audit_matches after insert or update or delete on public.matches
  for each row execute function public.audit_trigger();
create trigger audit_deals after insert or update or delete on public.deals
  for each row execute function public.audit_trigger();
create trigger audit_share_links after insert or update or delete on public.share_links
  for each row execute function public.audit_trigger();
create trigger audit_documents after insert or update or delete on public.documents
  for each row execute function public.audit_trigger();
create trigger audit_service_orders after insert or update or delete on public.service_orders
  for each row execute function public.audit_trigger();

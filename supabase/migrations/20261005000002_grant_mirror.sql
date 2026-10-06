-- Funding Lab — local mirror of "Proactive Disclosure – Grants and Contributions"
-- Source: open.canada.ca resource 1d15a62f-5656-49ad-8c88-f40ce689d831 (Open Government Licence – Canada)
-- The live CKAN datastore_search full-text query times out on ~1.3M rows (HTTP 409), so we mirror it,
-- dedupe amendments, drop individuals, and look up names with pg_trgm.

-- unaccent() is STABLE; wrap it so it can be used in generated columns and indexes.
create or replace function public.fl_unaccent(t text) returns text
language sql immutable parallel safe strict set search_path = public, extensions as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, t);
$$;

-- Must stay in sync with lib/grants/normalize.ts (unit-tested there).
create or replace function public.fl_normalize_name(n text) returns text
language sql immutable parallel safe set search_path = public, extensions as $$
  select nullif(btrim(regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(lower(public.fl_unaccent(coalesce(n, ''))), '&', ' and ', 'g'),
             '[^a-z0-9 ]', ' ', 'g'),
           '\m(inc|incorporated|ltd|limited|ltee|corp|corporation|co|company|llc|lp|llp|ulc|enterprises?)\M', ' ', 'g'),
         '\s+', ' ', 'g')), '');
$$;

create or replace function public.fl_try_date(t text) returns date
language plpgsql immutable parallel safe as $$
begin
  if t is null or btrim(t) = '' then return null; end if;
  return t::date;
exception when others then
  return null;
end $$;

create or replace function public.fl_try_numeric(t text) returns numeric
language plpgsql immutable parallel safe as $$
begin
  if t is null or btrim(t) = '' then return null; end if;
  return replace(t, ',', '')::numeric;
exception when others then
  return null;
end $$;

-- Raw load target. UNLOGGED: rebuilt every sync, no WAL cost.
create unlogged table public.grants_staging (
  ref_number text,
  amendment_number text,
  amendment_date text,
  agreement_type text,
  recipient_type text,
  recipient_business_number text,
  recipient_legal_name text,
  recipient_operating_name text,
  recipient_province text,
  recipient_city text,
  recipient_postal_code text,
  prog_name_en text,
  agreement_title_en text,
  agreement_value text,
  agreement_start_date text,
  agreement_end_date text,
  description_en text,
  naics_identifier text,
  owner_org text,
  owner_org_title text
);

create table public.grants_mirror (
  owner_org text not null,
  ref_number text not null,
  amendment_number integer,
  agreement_type char(1),
  recipient_type text,
  recipient_business_number text,
  recipient_legal_name text not null,
  recipient_operating_name text,
  recipient_province char(2),
  recipient_city text,
  recipient_postal_code text,
  prog_name_en text,
  agreement_title_en text,
  agreement_value numeric(16,2),
  agreement_start_date date,
  agreement_end_date date,
  description_en text,
  naics_identifier text,
  owner_org_title text,
  legal_norm text generated always as (public.fl_normalize_name(recipient_legal_name)) stored,
  operating_norm text generated always as (public.fl_normalize_name(recipient_operating_name)) stored,
  bn9 text generated always as (nullif(left(regexp_replace(coalesce(recipient_business_number, ''), '\D', '', 'g'), 9), '')) stored,
  city_norm text generated always as (public.fl_normalize_name(recipient_city)) stored,
  synced_at timestamptz not null default now(),
  primary key (owner_org, ref_number)
);
create index grants_mirror_legal_trgm on public.grants_mirror using gin (legal_norm extensions.gin_trgm_ops);
create index grants_mirror_operating_trgm on public.grants_mirror using gin (operating_norm extensions.gin_trgm_ops);
create index grants_mirror_legal_eq on public.grants_mirror (legal_norm);
create index grants_mirror_operating_eq on public.grants_mirror (operating_norm);
create index grants_mirror_bn9 on public.grants_mirror (bn9) where bn9 is not null;

create table public.grant_sync_runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_loaded bigint,
  rows_upserted bigint,
  rows_removed bigint,
  source_url text,
  status text not null default 'running' check (status in ('running', 'ok', 'failed')),
  error text
);

-- Staging -> mirror. Keeps the latest amendment per agreement and excludes individuals / sole proprietors
-- (recipient_type 'P') so the platform never surfaces personal records.
create or replace function public.fl_promote_grants(p_run_id bigint, p_full_refresh boolean default true)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_start timestamptz := now();
  v_upserted bigint;
  v_removed bigint := 0;
begin
  insert into public.grants_mirror as g (
    owner_org, ref_number, amendment_number, agreement_type, recipient_type, recipient_business_number,
    recipient_legal_name, recipient_operating_name, recipient_province, recipient_city, recipient_postal_code,
    prog_name_en, agreement_title_en, agreement_value, agreement_start_date, agreement_end_date,
    description_en, naics_identifier, owner_org_title, synced_at)
  select distinct on (s.owner_org, s.ref_number)
    s.owner_org, s.ref_number,
    nullif(regexp_replace(coalesce(s.amendment_number, ''), '\D', '', 'g'), '')::int,
    left(nullif(s.agreement_type, ''), 1),
    nullif(s.recipient_type, ''),
    nullif(s.recipient_business_number, ''),
    btrim(s.recipient_legal_name),
    nullif(btrim(s.recipient_operating_name), ''),
    upper(left(nullif(s.recipient_province, ''), 2)),
    nullif(btrim(s.recipient_city), ''),
    nullif(s.recipient_postal_code, ''),
    nullif(s.prog_name_en, ''),
    nullif(s.agreement_title_en, ''),
    public.fl_try_numeric(s.agreement_value),
    public.fl_try_date(s.agreement_start_date),
    public.fl_try_date(s.agreement_end_date),
    nullif(s.description_en, ''),
    nullif(s.naics_identifier, ''),
    split_part(coalesce(s.owner_org_title, ''), ' | ', 1),
    v_start
  from public.grants_staging s
  where s.owner_org is not null and s.ref_number is not null
    and coalesce(btrim(s.recipient_legal_name), '') <> ''
    and coalesce(s.recipient_type, '') <> 'P'
  order by s.owner_org, s.ref_number,
    nullif(regexp_replace(coalesce(s.amendment_number, ''), '\D', '', 'g'), '')::int desc nulls last,
    public.fl_try_date(s.amendment_date) desc nulls last
  on conflict (owner_org, ref_number) do update set
    amendment_number = excluded.amendment_number,
    agreement_type = excluded.agreement_type,
    recipient_type = excluded.recipient_type,
    recipient_business_number = excluded.recipient_business_number,
    recipient_legal_name = excluded.recipient_legal_name,
    recipient_operating_name = excluded.recipient_operating_name,
    recipient_province = excluded.recipient_province,
    recipient_city = excluded.recipient_city,
    recipient_postal_code = excluded.recipient_postal_code,
    prog_name_en = excluded.prog_name_en,
    agreement_title_en = excluded.agreement_title_en,
    agreement_value = excluded.agreement_value,
    agreement_start_date = excluded.agreement_start_date,
    agreement_end_date = excluded.agreement_end_date,
    description_en = excluded.description_en,
    naics_identifier = excluded.naics_identifier,
    owner_org_title = excluded.owner_org_title,
    synced_at = excluded.synced_at;  -- every surviving row gets this run's timestamp; older rows are removed below
  get diagnostics v_upserted = row_count;

  if p_full_refresh then
    delete from public.grants_mirror where synced_at < v_start;
    get diagnostics v_removed = row_count;
  end if;

  truncate public.grants_staging;

  update public.grant_sync_runs
     set finished_at = now(), rows_upserted = v_upserted, rows_removed = v_removed, status = 'ok'
   where id = p_run_id;

  return jsonb_build_object('upserted', v_upserted, 'removed', v_removed);
end $$;
revoke all on function public.fl_promote_grants(bigint, boolean) from public, anon, authenticated;

-- Name lookup. Returns candidate agreements; the API route (lib/grants/lookup.ts) groups them by
-- entity and decides confident / possible / none.
create or replace function public.fl_grant_lookup(
  p_name text,
  p_province text default null,
  p_city text default null,
  p_business_number text default null,
  p_limit integer default 120
) returns table (
  owner_org text,
  ref_number text,
  recipient_legal_name text,
  recipient_operating_name text,
  recipient_city text,
  recipient_province text,
  prog_name_en text,
  owner_org_title text,
  agreement_type char(1),
  agreement_value numeric,
  agreement_start_date date,
  description_en text,
  amendment_number integer,
  legal_norm text,
  score real,
  match_kind text,
  same_province boolean,
  same_city boolean
)
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  q text := public.fl_normalize_name(p_name);
  v_city text := public.fl_normalize_name(p_city);
  v_bn9 text := nullif(left(regexp_replace(coalesce(p_business_number, ''), '\D', '', 'g'), 9), '');
begin
  if (q is null or length(q) < 3) and v_bn9 is null then
    return;
  end if;
  perform set_config('pg_trgm.similarity_threshold', '0.55', true);

  return query
  with hits as (
    select g.*,
      case
        when v_bn9 is not null and g.bn9 = v_bn9 then 1.0::real
        else greatest(similarity(g.legal_norm, q), coalesce(similarity(g.operating_norm, q), 0))::real
      end as s,
      case
        when v_bn9 is not null and g.bn9 = v_bn9 then 'business_number'
        when g.legal_norm = q or g.operating_norm = q then 'exact'
        else 'fuzzy'
      end as kind
    from public.grants_mirror g
    where (v_bn9 is not null and g.bn9 = v_bn9)
       or (q is not null and (g.legal_norm % q or g.operating_norm % q))
  )
  select h.owner_org, h.ref_number, h.recipient_legal_name, h.recipient_operating_name,
         h.recipient_city, h.recipient_province::text, h.prog_name_en, h.owner_org_title,
         h.agreement_type, h.agreement_value, h.agreement_start_date, h.description_en,
         h.amendment_number, h.legal_norm, h.s, h.kind,
         (p_province is not null and h.recipient_province = upper(p_province)) as same_province,
         (v_city is not null and h.city_norm = v_city) as same_city
  from hits h
  order by h.s desc, h.agreement_start_date desc nulls last
  limit greatest(1, least(p_limit, 300));
end $$;
revoke all on function public.fl_grant_lookup(text, text, text, text, integer) from public, anon;
grant execute on function public.fl_grant_lookup(text, text, text, text, integer) to authenticated, service_role;

alter table public.grants_mirror enable row level security;
alter table public.grants_staging enable row level security;
alter table public.grant_sync_runs enable row level security;
-- Public open data, but only reachable through fl_grant_lookup for signed-in users and the admin console.
create policy grants_mirror_admin_read on public.grants_mirror for select using (public.is_admin());
create policy grant_sync_runs_admin_read on public.grant_sync_runs for select using (public.is_admin());

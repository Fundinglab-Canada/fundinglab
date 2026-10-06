-- Funding Lab — Phase 1 hardening
-- 1. Members may tick their own homework but never mark themselves "attended" (admin-only).
-- 2. Unpaid cohort checkouts release their seat after 2 hours (called by the hourly cron).
-- 3. Assessment-driven readiness can't be set above 100 or by other users (column check + owner policy already apply).

drop policy if exists attendance_self_homework on public.cohort_attendance;

create or replace function public.fl_set_homework(p_session uuid, p_done boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_enrollment uuid;
begin
  select e.id into v_enrollment
  from public.cohort_sessions s
  join public.cohort_enrollments e on e.cohort_id = s.cohort_id
  where s.id = p_session and e.user_id = auth.uid() and e.status in ('enrolled', 'completed');
  if v_enrollment is null then raise exception 'Not enrolled in this cohort'; end if;
  insert into public.cohort_attendance (session_id, enrollment_id, homework_done)
  values (p_session, v_enrollment, p_done)
  on conflict (session_id, enrollment_id) do update set homework_done = excluded.homework_done;
end $$;
revoke all on function public.fl_set_homework(uuid, boolean) from public, anon;
grant execute on function public.fl_set_homework(uuid, boolean) to authenticated;

create or replace function public.fl_release_stale_checkouts()
returns integer language sql security definer set search_path = public as $$
  with x as (
    update public.cohort_enrollments set status = 'cancelled'
    where status = 'pending_payment' and created_at < now() - interval '2 hours'
    returning 1
  ) select count(*)::int from x;
$$;
revoke all on function public.fl_release_stale_checkouts() from public, anon, authenticated;


-- 5. Anonymized one-liner: strip the business's own name, legal name and website from the description
--    before it reaches partners who haven't been mutually introduced.
create or replace function public.fl_anon_one_liner(p_desc text, p_name text, p_legal text, p_website text)
returns text language plpgsql immutable set search_path = public as $$
declare
  t text := left(coalesce(p_desc, ''), 160);
  term text;
begin
  foreach term in array array[p_legal, p_name, regexp_replace(coalesce(p_website, ''), '^(https?://)?(www\.)?([^/]+).*$', '\3')] loop
    if term is not null and length(term) >= 3 then
      t := regexp_replace(t, regexp_replace(term, '([.*+?^${}()|\[\]\\])', '\\\1', 'g'), '[the company]', 'gi');
    end if;
  end loop;
  return nullif(t, '');
end $$;

-- 4. Partners can "Pass" on an anonymized deal-flow item; passed items are hidden from their feed.
create table if not exists public.partner_passes (
  partner_id uuid not null references public.partners (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (partner_id, business_id)
);
alter table public.partner_passes enable row level security;
create policy partner_passes_admin on public.partner_passes for select using (public.is_admin());
-- No partner policies: partners only touch this through the functions below, so business ids never reach them.

create or replace function public.fl_partner_pass(p_ref text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_partner uuid;
  v_business uuid;
begin
  select id into v_partner from public.partners where user_id = auth.uid() and status = 'active';
  if v_partner is null then raise exception 'Only active partners can do this'; end if;
  select b.id into v_business from public.businesses b
   where b.consent_matching and encode(hmac(b.id::text, v_partner::text, 'sha256'), 'hex') = p_ref;
  if v_business is null then raise exception 'Opportunity not found'; end if;
  insert into public.partner_passes (partner_id, business_id) values (v_partner, v_business) on conflict do nothing;
end $$;
grant execute on function public.fl_partner_pass(text) to authenticated;

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
         public.fl_anon_one_liner(b.description, b.name, b.legal_name, b.website), b.created_at,
         (select m.status::text from public.matches m where m.business_id = b.id and m.partner_id = v_partner)
  from public.businesses b
  where b.consent_matching and b.stage is not null and b.profile_step >= 4
    and not exists (select 1 from public.partner_passes x where x.partner_id = v_partner and x.business_id = b.id)
  order by b.readiness_score desc, b.created_at desc
  limit 200;
end $$;

create or replace function public.fl_partner_introductions()
returns table (
  match_id uuid, status public.match_status, score smallint, reasons text[], approved_at timestamptz, expires_at timestamptz,
  business_opt_in boolean, partner_opt_in boolean,
  industry text, province char(2), stage public.business_stage, amount_sought numeric, use_of_funds text[],
  readiness_score smallint, one_liner text,
  business_name text, business_slug text, website text, contact_name text, contact_email text, contact_phone text
) language sql stable security definer set search_path = public as $$
  select m.id, m.status, m.score, m.reasons, m.approved_at, m.expires_at, m.business_opt_in, m.partner_opt_in,
         b.industry, b.province, b.stage, b.amount_sought, b.use_of_funds, b.readiness_score,
         case when m.status = 'mutual' then left(b.description, 300) else public.fl_anon_one_liner(b.description, b.name, b.legal_name, b.website) end,
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

-- RLS test suite (Acceptance Criteria 4, 5, 7): partner privacy, anonymized deal flow, public surfaces.
-- Run after migrations + seed (+ seed_programs) on a scratch database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_privacy.sql
\set QUIET on
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'biz@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000c1', 'vc@example.com', '{"intended_role":"partner"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'angel@example.com', '{"intended_role":"partner"}');
update public.partners set user_id = '00000000-0000-0000-0000-0000000000c1' where display_name like 'Harbourline%';
update public.partners set user_id = '00000000-0000-0000-0000-0000000000c2' where display_name like 'Priya%';
insert into public.businesses (id, owner_id, slug, name, website, industry, province, city, stage, amount_sought, use_of_funds,
  consent_matching, consent_sharing, visibility, profile_step, description, contact_email)
values ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'secret-co', 'Secret Co Ltd.', 'secretco.ca',
  'advanced_manufacturing', 'BC', 'Burnaby', 'growth', 1500000, '{rd}', true, true, 'link', 7, 'Robotic welding cells for small fabricators', 'ceo@secretco.ca');

-- ---------------------------------------------------------------- Anonymous visitor
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ declare t jsonb; begin
  assert (select count(*) from public.partners) = 0, 'anon cannot read partners';
  assert (select count(*) from public.partner_criteria) = 0, 'anon cannot read partner criteria';
  assert (select count(*) from public.businesses) = 0, 'anon cannot read businesses';
  assert (select count(*) from public.matches) = 0, 'anon cannot read matches';
  assert (select count(*) from public.job_applications) = 0, 'anon cannot read job applications';
  assert (select count(*) from public.contact_messages) = 0, 'anon cannot read contact messages';
  assert (select count(*) from public.leads) = 0, 'anon cannot read leads';
  assert (select count(*) from public.programs) >= 20, 'programs are public';
  assert (select count(*) from public.jobs) = 3, 'open jobs are public';
  assert (select count(*) from public.webinar_sessions) = 0, 'raw sessions (with join links) are admin-only';
  assert (select count(*) from public.webinar_sessions_public) >= 1, 'public session view works';
  assert not exists (select 1 from information_schema.columns where table_name = 'webinar_sessions_public' and column_name = 'join_url'),
    'public view never exposes join links';
  assert (select seats_left from public.fl_cohort_seats((select id from public.cohorts limit 1))) = 25;
  t := public.fl_grant_teaser('NORTHWIND ROBOTICS INC', 'BC');
  assert (t->>'found')::boolean and (t->>'count')::int = 2, 'teaser: confident match returns a count only';
  assert not (public.fl_grant_teaser('Coastal Bio', 'BC')->>'found')::boolean, 'teaser: fuzzy names never confirmed';
  assert not (public.fl_grant_teaser('Northwind Robotics', 'ON')->>'found')::boolean, 'teaser: province must match';
end $$;
reset role;

-- ---------------------------------------------------------------- Business user
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
do $$ begin
  assert (select count(*) from public.partners) = 0, 'AC4: business cannot query partners';
  assert (select count(*) from public.partner_criteria) = 0, 'AC4: business cannot query partner criteria';
  assert (select count(*) from public.matches) = 0, 'AC4: business cannot query matches';
  assert (select count(*) from public.fl_partner_deal_flow()) = 0, 'business has no deal flow';
  assert (select count(*) from public.fl_partner_introductions()) = 0, 'business cannot use partner RPCs';
  assert (select count(*) from public.fl_my_introductions('10000000-0000-0000-0000-0000000000b1')) = 0, 'no intros yet';
  begin
    perform public.fl_partner_express_interest('x');
    raise exception 'should fail';
  exception when others then assert sqlerrm like 'Only active partners%', sqlerrm; end;
end $$;
reset role;

-- ---------------------------------------------------------------- Partner: anonymized deal flow (AC5)
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
do $$ declare r record; ref1 text; begin
  select * into r from public.fl_partner_deal_flow() where one_liner = 'Robotic welding cells for small fabricators' and amount_sought = 1500000 and province = 'BC' and industry = 'advanced_manufacturing' and stage = 'growth' and readiness_score = 0;
  assert found, 'consented business appears in deal flow';
  assert r.opportunity_ref !~ '10000000', 'opaque ref, not the business id';
  ref1 := r.opportunity_ref;
  assert (select count(*) from public.businesses) = 0, 'AC5: partner cannot read business rows before mutual';
  perform public.fl_partner_express_interest(ref1);
  assert (select interest_status from public.fl_partner_deal_flow() where opportunity_ref = ref1) = 'suggested';
  perform set_config('test.ref1', ref1, true);
end $$;
-- Columns of the deal-flow function never include identity fields
do $$ begin
  assert not exists (
    select 1 from (select unnest(proargnames) a from pg_proc where proname = 'fl_partner_deal_flow') x
    where a in ('name', 'business_name', 'website', 'contact_email', 'slug')), 'AC5: deal flow exposes no identity fields';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
do $$ begin
  assert not exists (select 1 from public.fl_partner_deal_flow() where opportunity_ref = current_setting('test.ref1')),
    'refs are per-partner and cannot be correlated';
end $$;
reset role;

-- ---------------------------------------------------------------- Admin approves; identities stay hidden until both accept
select set_config('request.jwt.claim.sub', '', true);
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c2';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
select public.fl_approve_match(id) from public.matches where business_id = '10000000-0000-0000-0000-0000000000b1';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
do $$ declare r record; begin
  select * into r from public.fl_partner_introductions() where one_liner = 'Robotic welding cells for small fabricators';
  assert found, 'approved introduction visible to partner';
  assert r.business_name is null and r.contact_email is null and r.website is null, 'AC4/5: business anonymous to partner before mutual';
  assert public.fl_respond_to_match(r.match_id, true) = 'approved';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
do $$ declare r record; begin
  select * into r from public.fl_my_introductions('10000000-0000-0000-0000-0000000000b1');
  assert r.partner_name is null and r.contact_email is null and r.linkedin_url is null, 'AC4: partner anonymous to business before mutual';
  assert r.partner_type = 'venture_capital' and array_length(r.reasons, 1) >= 1, 'business sees type and why it fits';
  assert public.fl_respond_to_match(r.match_id, true) = 'mutual';
  select * into r from public.fl_my_introductions('10000000-0000-0000-0000-0000000000b1');
  assert r.partner_name like 'Harbourline%' and r.contact_email = 'dana@example.com', 'released on mutual';
  assert (select count(*) from public.partners) = 0, 'AC4: still no direct table access after mutual';
end $$;
reset role;

-- ---------------------------------------------------------------- One-liner anonymizer + Pass
do $$ begin
  assert public.fl_anon_one_liner('Secret Co Ltd. builds robots. Visit secretco.ca', 'Secret Co', 'Secret Co Ltd.', 'https://secretco.ca/x')
    = '[the company] builds robots. Visit [the company]', 'name, legal name and domain are stripped';
end $$;
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000c3', 'lender@example.com', '{"intended_role":"partner"}');
update public.partners set user_id = '00000000-0000-0000-0000-0000000000c3' where display_name like 'Valley Credit%';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c3', true);
do $$ declare ref text; n int; begin
  select count(*) into n from public.fl_partner_deal_flow();
  select opportunity_ref into ref from public.fl_partner_deal_flow() limit 1;
  perform public.fl_partner_pass(ref);
  assert (select count(*) from public.fl_partner_deal_flow()) = n - 1, 'passed items leave the feed';
  assert (select count(*) from public.partner_passes) = 0, 'partners cannot read pass rows (no business ids)';
end $$;
reset role;

-- ---------------------------------------------------------------- Cohort members can't self-mark attendance
select set_config('request.jwt.claim.sub', '', true);
insert into public.cohort_enrollments (id, cohort_id, user_id, status)
select '20000000-0000-0000-0000-0000000000e1', id, '00000000-0000-0000-0000-0000000000b1', 'enrolled' from public.cohorts limit 1;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
do $$ declare s uuid; begin
  select id into s from public.cohort_sessions where week_number = 1 limit 1;
  assert s is not null, 'member sees own cohort sessions';
  perform public.fl_set_homework(s, true);
  assert (select homework_done and not attended from public.cohort_attendance where session_id = s), 'homework recorded, attendance untouched';
  update public.cohort_attendance set attended = true where session_id = s;
  assert (select not attended from public.cohort_attendance where session_id = s), 'member cannot mark attended';
  assert (select count(*) from public.cohort_enrollments) = 1, 'member sees only own enrollment';
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.cohort_sessions) = 0, 'non-members cannot read cohort sessions';
  begin
    perform public.fl_set_homework((select session_id from public.cohort_attendance limit 1), true);
    raise exception 'should fail';
  exception when others then null; end;
end $$;
reset role;

-- ---------------------------------------------------------------- Expiry
select set_config('request.jwt.claim.sub', '', true);
update public.matches set status = 'approved', expires_at = now() - interval '1 day', business_opt_in = null, partner_opt_in = null;
select public.fl_expire_and_remind_matches();
do $$ begin
  assert (select bool_and(status = 'expired') from public.matches), 'unanswered introductions expire after 14 days';
end $$;

rollback;
\echo 'rls_privacy.sql: all checks passed'

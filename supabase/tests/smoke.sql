-- End-to-end smoke test for the database layer. Run after migrations + seed on a scratch database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/smoke.sql
-- Raises an exception on the first failed expectation.
\set QUIET on
begin;

-- Users: one business owner, one partner user, one admin
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000b', 'owner@example.com', '{"full_name":"Alex Chen"}'),
  ('00000000-0000-0000-0000-00000000000c', 'partner@example.com', '{"intended_role":"partner"}'),
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.com', '{"intended_role":"admin"}');
do $$ begin
  assert (select role from public.profiles where email = 'owner@example.com') = 'business';
  assert (select role from public.profiles where email = 'partner@example.com') = 'partner';
  assert (select role from public.profiles where email = 'admin@example.com') = 'business', 'self-signup must never grant admin';
end $$;
update public.profiles set role = 'admin' where email = 'admin@example.com';

-- Normalization
do $$ begin
  assert public.fl_normalize_name('NORTHWIND ROBOTICS INC.') = 'northwind robotics';
  assert public.fl_normalize_name('Société Générale Ltée') = 'societe generale';
  assert public.fl_normalize_name('A&W Food Services of Canada Corp') = 'a and w food services of canada';
end $$;

-- Grant mirror promotion: keeps latest amendment, drops individuals
insert into public.grant_sync_runs (id, source_url) values (1, 'test');
insert into public.grants_staging (owner_org, ref_number, amendment_number, recipient_type, recipient_legal_name, recipient_province, recipient_city, prog_name_en, agreement_value, agreement_start_date)
values ('nrc-cnrc','T-1','0','F','Maple Pantry Foods Ltd.','BC','Langley','IRAP','50000','2023-01-10'),
       ('nrc-cnrc','T-1','2','F','Maple Pantry Foods Ltd.','BC','Langley','IRAP','72000','2023-01-10'),
       ('nrc-cnrc','T-1','1','F','Maple Pantry Foods Ltd.','BC','Langley','IRAP','61000','2023-01-10'),
       ('nserc','T-2','0','P','Doe, Jane','ON','Ottawa','Scholarship','6000','2024-09-01');
select public.fl_promote_grants(1, false);
do $$ begin
  assert (select agreement_value from public.grants_mirror where ref_number = 'T-1') = 72000, 'latest amendment kept';
  assert not exists (select 1 from public.grants_mirror where ref_number = 'T-2'), 'individuals excluded';
  assert (select status from public.grant_sync_runs where id = 1) = 'ok';
end $$;

-- Business owner session
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
insert into public.businesses (id, owner_id, slug, name, industry, province, city, stage, amount_sought, use_of_funds, consent_matching, consent_sharing, visibility)
values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'northwind-robotics', 'Northwind Robotics Inc.', 'advanced_manufacturing', 'BC', 'Burnaby', 'growth', 1500000, '{hire_staff,rd,ip_patent}', true, true, 'link');

do $$ declare n int; k text; begin
  select count(*), min(match_kind) into n, k from public.fl_grant_lookup('Northwind Robotics Inc.', 'BC', 'Burnaby');
  assert n = 2 and k = 'exact', format('exact lookup returned %s rows kind %s', n, k);
  select count(*) into n from public.fl_grant_lookup('Coastal Bio', 'BC', null) where score >= 0.55;
  assert n >= 1, 'fuzzy candidates found';
  select count(*) into n from public.fl_grant_lookup('Acme Widgets', 'BC', null);
  assert n = 0, 'no false positives';
end $$;

-- RLS: owner cannot see partners or matches directly
do $$ begin
  assert (select count(*) from public.partners) = 0, 'partners hidden from businesses';
  assert (select count(*) from public.matches) = 0;
end $$;

-- Share link with password
do $$ declare t text; r jsonb; begin
  select token into t from public.fl_create_share_link('10000000-0000-0000-0000-000000000001', 'Test VC', now() + interval '7 days', 's3cret');
  r := public.fl_open_share('northwind-robotics', t, null);
  assert r->>'status' = 'password_required';
  r := public.fl_open_share('northwind-robotics', t, 'wrong');
  assert r->>'status' = 'password_required';
  r := public.fl_open_share('northwind-robotics', t, 's3cret', 'vc@example.com', 'abc', 'test-agent');
  assert r->>'status' = 'ok' and r->'snapshot'->>'name' = 'Northwind Robotics Inc.';
  assert (select count(*) from public.share_link_views) = 1;
end $$;

-- Admin creates and approves a match
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
insert into public.matches (id, business_id, partner_id, score, reasons)
select '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', id, 90, '{stage,industry}'
from public.partners where display_name like 'Harbourline%';
update public.partners set user_id = '00000000-0000-0000-0000-00000000000c' where display_name like 'Harbourline%';
select public.fl_approve_match('20000000-0000-0000-0000-000000000001');
do $$ begin
  assert not exists (select 1 from public.deals where match_id = '20000000-0000-0000-0000-000000000001'), 'deal opens only on mutual opt-in';
  assert (select count(*) from public.notifications where kind in ('introduction_proposed', 'opportunity_curated')) = 2;
end $$;

-- Business sees name but not contact before mutual opt-in
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
do $$ declare r record; begin
  select * into r from public.fl_my_introductions('10000000-0000-0000-0000-000000000001');
  assert r.partner_name is null and r.contact_email is null and r.partner_type = 'venture_capital', 'identity hidden before mutual';
  assert public.fl_respond_to_match('20000000-0000-0000-0000-000000000001', true) = 'approved';
end $$;

-- Partner opts in -> mutual, contact released, partner can now read the business
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
do $$ declare r record; begin
  assert public.fl_respond_to_match('20000000-0000-0000-0000-000000000001', true) = 'mutual';
  select * into r from public.fl_partner_introductions();
  assert r.business_name = 'Northwind Robotics Inc.' and r.business_slug = 'northwind-robotics', 'business identity released on mutual';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
do $$ declare r record; begin
  select * into r from public.fl_my_introductions('10000000-0000-0000-0000-000000000001');
  assert r.contact_email = 'dana@example.com' and r.partner_name like 'Harbourline%', 'identity and contact released after mutual opt-in';
  assert (select status from public.deals where match_id = '20000000-0000-0000-0000-000000000001') = 'introduced';
end $$;

-- Partners cannot approve themselves
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
do $$ begin
  begin
    update public.partners set status = 'active', membership_tier = 'premier' where user_id = auth.uid();
    raise exception 'should have failed';
  exception when others then
    assert sqlerrm like 'Only Funding Lab%', sqlerrm;
  end;
end $$;

-- Commission is computed only when funded
reset role;
update public.deals set status = 'funded', funded_amount = 1000000 where match_id = '20000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select commission_amount from public.deals where match_id = '20000000-0000-0000-0000-000000000001') = 30000;
end $$;

rollback;
\echo 'smoke.sql: all checks passed'

-- Phase 2 test suite: Application Center side effects, data room access (AC 8), plan checks and owner isolation.
-- Run after migrations + seeds on a scratch database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase2.sql
\set QUIET on
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000002a1', 'owner-a@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000002b1', 'owner-b@example.com', '{}');
insert into public.businesses (id, owner_id, slug, name, province, stage) values
  ('20000000-0000-0000-0000-0000000002a1', '00000000-0000-0000-0000-0000000002a1', 'phase2-a', 'Phase Two A', 'BC', 'seed'),
  ('20000000-0000-0000-0000-0000000002b1', '00000000-0000-0000-0000-0000000002b1', 'phase2-b', 'Phase Two B', 'ON', 'growth');
insert into public.documents (id, business_id, kind, folder, storage_path, file_name, mime_type) values
  ('30000000-0000-0000-0000-0000000002a1', '20000000-0000-0000-0000-0000000002a1', 'financials', 'financial', '20000000-0000-0000-0000-0000000002a1/fs.pdf', 'fs.pdf', 'application/pdf'),
  ('30000000-0000-0000-0000-0000000002a2', '20000000-0000-0000-0000-0000000002a1', 'other', 'legal', '20000000-0000-0000-0000-0000000002a1/old.pdf', 'old.pdf', 'application/pdf');
insert into public.documents (id, business_id, kind, folder, storage_path, file_name, mime_type, version, previous_id) values
  ('30000000-0000-0000-0000-0000000002a3', '20000000-0000-0000-0000-0000000002a1', 'other', 'legal', '20000000-0000-0000-0000-0000000002a1/new.pdf', 'new.pdf', 'application/pdf', 2, '30000000-0000-0000-0000-0000000002a2');

-- ---------------------------------------------------------------- Owner A
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000002a1', true);
do $$ declare
  v_app uuid; v_fh uuid; v_n int; v_token text;
begin
  assert public.fl_my_plan() = 'free', 'new owners are on Free';
  begin
    insert into public.subscriptions (user_id, plan) values ('00000000-0000-0000-0000-0000000002a1', 'pro');
    raise exception 'should fail';
  exception when others then assert sqlerrm like '%row-level security%', 'owners cannot grant themselves a plan: ' || sqlerrm; end;

  -- Approval creates funding history + obligations once; the client can't point at someone else's history row.
  insert into public.applications (business_id, type, title, amount_requested, status, funding_history_id)
  values ('20000000-0000-0000-0000-0000000002a1', 'grant', 'Test grant', 50000, 'planning',
          (select id from public.funding_history limit 1))
  returning id, funding_history_id into v_app, v_fh;
  assert v_fh is null, 'funding_history_id is server-set only';
  update public.applications set status = 'submitted' where id = v_app;
  assert (select submitted_at is not null from public.applications where id = v_app), 'submitted_at stamped';
  update public.applications set status = 'approved', amount_approved = 40000 where id = v_app;
  select funding_history_id into v_fh from public.applications where id = v_app;
  assert v_fh is not null, 'approval creates a funding history row';
  assert (select amount from public.funding_history where id = v_fh) = 40000, 'approved amount recorded';
  assert (select source from public.funding_history where id = v_fh) = 'grant_federal', 'grant without program defaults to federal';
  select count(*) into v_n from public.obligations where application_id = v_app;
  assert v_n = 3, 'grant approval creates claim + interim + final report obligations, got ' || v_n;
  update public.applications set status = 'submitted' where id = v_app;
  update public.applications set status = 'approved' where id = v_app;
  assert (select count(*) from public.obligations where application_id = v_app) = 3, 'obligations are not duplicated';
  assert (select count(*) from public.funding_history where business_id = '20000000-0000-0000-0000-0000000002a1') = 1, 'history not duplicated';

  -- Data room invitation: token is server-generated and can't be edited.
  insert into public.data_room_access (business_id, email, expires_at, can_download, token)
  values ('20000000-0000-0000-0000-0000000002a1', 'investor@example.com', now() + interval '7 days', false, 'chosen-by-client-token-123')
  returning token into v_token;
  assert v_token <> 'chosen-by-client-token-123', 'tokens are always server-generated';
  begin
    update public.data_room_access set email = 'other@example.com' where token = v_token;
    raise exception 'should fail';
  exception when others then assert sqlerrm like 'Create a new invitation%', sqlerrm; end;
  perform set_config('test.token', v_token, true);
end $$;
reset role;

-- ---------------------------------------------------------------- Owner B can't see A
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000002b1', true);
do $$ begin
  assert (select count(*) from public.applications where business_id = '20000000-0000-0000-0000-0000000002a1') = 0, 'other owners cannot read applications';
  assert (select count(*) from public.obligations where business_id = '20000000-0000-0000-0000-0000000002a1') = 0, 'or obligations';
  assert (select count(*) from public.data_room_access where business_id = '20000000-0000-0000-0000-0000000002a1') = 0, 'or data room invitations';
  assert (select count(*) from public.documents where business_id = '20000000-0000-0000-0000-0000000002a1') = 0, 'or documents';
  assert (select count(*) from public.document_views) = 0, 'or view logs';
  begin
    insert into public.applications (business_id, type, title) values ('20000000-0000-0000-0000-0000000002a1', 'loan', 'Sneaky');
    raise exception 'should fail';
  exception when others then assert sqlerrm like '%row-level security%', sqlerrm; end;
  begin
    insert into public.data_room_access (business_id, email, expires_at) values ('20000000-0000-0000-0000-0000000002a1', 'x@example.com', now() + interval '1 day');
    raise exception 'should fail';
  exception when others then assert sqlerrm like '%row-level security%', sqlerrm; end;
end $$;
reset role;

-- ---------------------------------------------------------------- Invited viewer (anonymous, AC 8)
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ declare r jsonb; t text := current_setting('test.token'); begin
  assert (select count(*) from public.data_room_access) = 0, 'anon cannot list invitations';
  assert (select count(*) from public.documents) = 0, 'anon cannot read documents';
  r := public.fl_data_room_open(t);
  assert r->>'status' = 'ok', 'valid token opens the room';
  assert jsonb_array_length(r->'documents') = 2, 'only the latest version of each document is listed';
  assert not (r::text like '%storage_path%'), 'viewers never see storage paths';
  assert (r->>'can_download')::boolean = false;
  assert public.fl_data_room_open('not-a-real-token-0000000')->>'status' = 'invalid';
  begin
    perform * from public.fl_data_room_file(t, '30000000-0000-0000-0000-0000000002a1', 'view');
    raise exception 'should fail';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- The file route runs as the service role.
do $$ declare t text := current_setting('test.token'); n int; begin
  assert (select count(*) from public.fl_data_room_file(t, '30000000-0000-0000-0000-0000000002a1', 'view')) = 1, 'view allowed';
  assert (select count(*) from public.fl_data_room_file(t, '30000000-0000-0000-0000-0000000002a1', 'download')) = 0, 'download blocked by toggle';
  assert (select count(*) from public.fl_data_room_file(t, (select id from public.documents where business_id <> '20000000-0000-0000-0000-0000000002a1' limit 1), 'view')) = 0,
    'other businesses'' files are never served';
  select count(*) into n from public.document_views where viewer_email = 'investor@example.com';
  assert n = 1, 'views are logged (denied requests are not), got ' || n;
  update public.data_room_access set can_download = true where token = t;
  assert (select count(*) from public.fl_data_room_file(t, '30000000-0000-0000-0000-0000000002a1', 'download')) = 1, 'download allowed after toggle';
  update public.data_room_access set expires_at = now() - interval '1 minute' where token = t;
  assert public.fl_data_room_open(t)->>'status' = 'expired', 'AC8: access expires on schedule';
  assert (select count(*) from public.fl_data_room_file(t, '30000000-0000-0000-0000-0000000002a1', 'view')) = 0, 'expired links serve nothing';
  update public.data_room_access set expires_at = now() + interval '1 day', revoked_at = now() where token = t;
  assert public.fl_data_room_open(t)->>'status' = 'invalid', 'revoked links stop working';
end $$;

-- Cohort perk: an enrolled member gets Growth for the cohort's duration.
insert into public.cohort_enrollments (cohort_id, user_id, status)
select id, '00000000-0000-0000-0000-0000000002b1', 'enrolled' from public.cohorts where end_date >= current_date limit 1;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000002b1', true);
do $$ begin
  assert public.fl_my_plan() = 'growth', 'cohort members get Growth, got ' || public.fl_my_plan();
end $$;
reset role;

rollback;
\echo 'phase2.sql: all checks passed'

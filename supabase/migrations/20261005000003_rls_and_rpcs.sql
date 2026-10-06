-- Funding Lab — row level security, privacy-preserving RPCs and storage
-- Principle: partners are never readable by businesses or visitors. Businesses learn about a partner only
-- through fl_my_introductions(), which reveals name/type after admin approval and contact details only
-- after both sides opt in.

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.funding_history enable row level security;
alter table public.grant_lookups enable row level security;
alter table public.documents enable row level security;
alter table public.partners enable row level security;
alter table public.partner_criteria enable row level security;
alter table public.matches enable row level security;
alter table public.deals enable row level security;
alter table public.service_orders enable row level security;
alter table public.share_links enable row level security;
alter table public.share_link_views enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- profiles
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update using (id = auth.uid() or public.is_admin());

-- businesses
create policy businesses_owner_all on public.businesses for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy businesses_admin_all on public.businesses for all using (public.is_admin()) with check (public.is_admin());
-- A partner can read a business only when it shared its profile with partners AND an introduction is mutual.
create or replace function public.partner_has_mutual_intro(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches m join public.partners p on p.id = m.partner_id
    where m.business_id = b and m.status = 'mutual' and p.user_id = auth.uid() and p.status = 'active'
  );
$$;
create policy businesses_partner_read on public.businesses for select using (
  visibility = 'partners' and consent_sharing and public.partner_has_mutual_intro(id)
);

-- funding_history / documents / grant_lookups follow the business
create policy funding_history_owner on public.funding_history for all
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy funding_history_admin on public.funding_history for all using (public.is_admin()) with check (public.is_admin());

create policy documents_owner on public.documents for all
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy documents_admin on public.documents for all using (public.is_admin()) with check (public.is_admin());

create policy grant_lookups_owner_read on public.grant_lookups for select
  using (created_by = auth.uid() or public.is_admin());
create policy grant_lookups_owner_insert on public.grant_lookups for insert
  with check (created_by = auth.uid() and (business_id is null or public.owns_business(business_id)));
create policy grant_lookups_owner_update on public.grant_lookups for update
  using (created_by = auth.uid()) with check (created_by = auth.uid());

-- partners: own row + admin. Applications always start pending (trigger blocks self-approval).
create policy partners_self_read on public.partners for select using (user_id = auth.uid() or public.is_admin());
create policy partners_self_insert on public.partners for insert
  with check (user_id = auth.uid() and status = 'pending');
create policy partners_self_update on public.partners for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy partners_admin_all on public.partners for all using (public.is_admin()) with check (public.is_admin());

create policy partner_criteria_self on public.partner_criteria for all
  using (public.owns_partner(partner_id)) with check (public.owns_partner(partner_id));
create policy partner_criteria_admin on public.partner_criteria for all using (public.is_admin()) with check (public.is_admin());

-- matches: admin only at table level. Businesses and partners use the RPCs below.
create policy matches_admin_all on public.matches for all using (public.is_admin()) with check (public.is_admin());

-- deals: admin manages; each side may read its own deals (partner identity still comes via RPC for businesses)
create policy deals_admin_all on public.deals for all using (public.is_admin()) with check (public.is_admin());
create policy deals_partner_read on public.deals for select using (public.owns_partner(partner_id));

-- service orders
create policy service_orders_owner_read on public.service_orders for select
  using (requested_by = auth.uid() or public.is_admin());
create policy service_orders_owner_insert on public.service_orders for insert
  with check (requested_by = auth.uid() and status in ('quote_requested', 'checkout_started')
              and (business_id is null or public.owns_business(business_id))
              and (partner_id is null or public.owns_partner(partner_id)));
create policy service_orders_admin on public.service_orders for all using (public.is_admin()) with check (public.is_admin());

-- share links: owner manages; viewers go through fl_open_share()
create policy share_links_owner on public.share_links for all
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy share_links_admin on public.share_links for select using (public.is_admin());
create policy share_link_views_owner on public.share_link_views for select using (
  exists (select 1 from public.share_links s where s.id = share_link_id and public.owns_business(s.business_id))
  or public.is_admin()
);

create policy notifications_self on public.notifications for select using (recipient_id = auth.uid());
create policy notifications_self_update on public.notifications for update using (recipient_id = auth.uid());
create policy notifications_admin on public.notifications for all using (public.is_admin()) with check (public.is_admin());

create policy audit_admin_read on public.audit_log for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Notifications helper
-- ---------------------------------------------------------------------------
create or replace function public.fl_notify(p_recipient uuid, p_kind text, p_payload jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (recipient_id, recipient_email, kind, payload)
  select p_recipient, p.email, p_kind, p_payload from public.profiles p where p.id = p_recipient;
$$;
revoke all on function public.fl_notify(uuid, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Matching RPCs
-- ---------------------------------------------------------------------------

-- Admin approves a suggested introduction: both sides are notified, a deal card is opened.
create or replace function public.fl_approve_match(p_match_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  m public.matches;
  v_owner uuid;
  v_partner_user uuid;
  v_type public.partner_type;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'Match not found'; end if;
  if m.status not in ('suggested', 'declined', 'dismissed') then return; end if;

  select owner_id into v_owner from public.businesses where id = m.business_id and consent_matching;
  if v_owner is null then raise exception 'The business has not consented to matching'; end if;

  update public.matches
     set status = 'approved', approved_by = auth.uid(), approved_at = now(), admin_note = p_note,
         business_opt_in = null, partner_opt_in = null
   where id = p_match_id;

  select user_id, type into v_partner_user, v_type from public.partners where id = m.partner_id;

  insert into public.deals (match_id, business_id, partner_id, deal_type, status, expected_amount, commission_rate)
  select m.id, m.business_id, m.partner_id, v_type::text, 'introduced', b.amount_sought,
         coalesce(p.success_fee_rate, 0.03)
  from public.businesses b, public.partners p
  where b.id = m.business_id and p.id = m.partner_id
  on conflict (match_id) do update set status = 'introduced';

  perform public.fl_notify(v_owner, 'introduction_proposed', jsonb_build_object('match_id', m.id));
  if v_partner_user is not null then
    perform public.fl_notify(v_partner_user, 'introduction_proposed', jsonb_build_object('match_id', m.id));
  end if;
end $$;
grant execute on function public.fl_approve_match(uuid, text) to authenticated;

-- Either side opts in or out. Contact details are released only when both have opted in.
create or replace function public.fl_respond_to_match(p_match_id uuid, p_accept boolean)
returns public.match_status language plpgsql security definer set search_path = public as $$
declare
  m public.matches;
  is_biz boolean;
  is_partner boolean;
  v_owner uuid;
  v_partner_user uuid;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found or m.status not in ('approved', 'mutual') then raise exception 'Introduction not available'; end if;
  select owner_id into v_owner from public.businesses where id = m.business_id;
  select user_id into v_partner_user from public.partners where id = m.partner_id;
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
    update public.deals set status = 'in_discussion' where match_id = m.id and status in ('new', 'introduced');
    perform public.fl_notify(v_owner, 'introduction_mutual', jsonb_build_object('match_id', m.id));
    if v_partner_user is not null then
      perform public.fl_notify(v_partner_user, 'introduction_mutual', jsonb_build_object('match_id', m.id));
    end if;
    return 'mutual';
  elsif m.business_opt_in is false or m.partner_opt_in is false then
    update public.matches set status = 'declined' where id = m.id;
    update public.deals set status = 'closed_lost', lost_reason = 'Introduction declined', closed_at = now()
      where match_id = m.id and status not in ('funded', 'closed_lost');
    return 'declined';
  end if;
  return m.status;
end $$;
grant execute on function public.fl_respond_to_match(uuid, boolean) to authenticated;

-- Business view of its introductions. Partner name/type after approval; contact only when mutual.
create or replace function public.fl_my_introductions(p_business_id uuid)
returns table (
  match_id uuid, status public.match_status, approved_at timestamptz,
  business_opt_in boolean, partner_opt_in boolean,
  partner_type public.partner_type, partner_name text, partner_company text, partner_location text, partner_bio text,
  contact_person text, contact_email text, contact_phone text, linkedin_url text
) language sql stable security definer set search_path = public as $$
  select m.id, m.status, m.approved_at, m.business_opt_in, m.partner_opt_in,
         p.type, p.display_name, p.company, p.location, p.bio,
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

-- Count of suggestions still under admin review (no identities).
create or replace function public.fl_pending_match_count(p_business_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.matches
  where business_id = p_business_id and status = 'suggested' and score >= 60 and public.owns_business(p_business_id);
$$;
grant execute on function public.fl_pending_match_count(uuid) to authenticated;

-- Partner view of its introductions. Business contact details only when mutual.
create or replace function public.fl_partner_introductions()
returns table (
  match_id uuid, status public.match_status, score smallint, approved_at timestamptz,
  business_opt_in boolean, partner_opt_in boolean,
  business_name text, industry text, province char(2), city text, stage public.business_stage,
  amount_sought numeric, use_of_funds text[], readiness_score smallint, business_slug text,
  contact_name text, contact_email text, contact_phone text
) language sql stable security definer set search_path = public as $$
  select m.id, m.status, m.score, m.approved_at, m.business_opt_in, m.partner_opt_in,
         b.name, b.industry, b.province, b.city, b.stage, b.amount_sought, b.use_of_funds, b.readiness_score,
         case when m.status = 'mutual' then b.slug end,
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

-- ---------------------------------------------------------------------------
-- Share links
-- ---------------------------------------------------------------------------
create or replace function public.fl_create_share_link(
  p_business_id uuid, p_label text, p_expires_at timestamptz default null, p_password text default null
) returns table (id uuid, token text)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.owns_business(p_business_id) then raise exception 'Not your business'; end if;
  if not exists (select 1 from public.businesses b where b.id = p_business_id and b.visibility <> 'private') then
    raise exception 'Set visibility to Link-only or Partners before sharing';
  end if;
  return query
  insert into public.share_links (business_id, label, expires_at, password_hash, created_by)
  values (p_business_id, p_label, p_expires_at,
          case when nullif(p_password, '') is not null then crypt(p_password, gen_salt('bf', 10)) end,
          auth.uid())
  returning share_links.id, share_links.token;
end $$;
grant execute on function public.fl_create_share_link(uuid, text, timestamptz, text) to authenticated;

-- Opens an investor snapshot from a tracked link. Callable anonymously.
-- Returns {status: 'ok'|'password_required'|'invalid'|'expired', snapshot?}
create or replace function public.fl_open_share(
  p_slug text, p_token text, p_password text default null,
  p_viewer_email text default null, p_ip_hash text default null, p_user_agent text default null, p_referrer text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  s public.share_links;
  b public.businesses;
  v_history jsonb;
  v_docs jsonb;
begin
  select l.* into s from public.share_links l
    join public.businesses bb on bb.id = l.business_id
   where l.token = p_token and bb.slug = p_slug and l.revoked_at is null;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if s.expires_at is not null and s.expires_at < now() then return jsonb_build_object('status', 'expired'); end if;
  if s.password_hash is not null and (p_password is null or crypt(p_password, s.password_hash) <> s.password_hash) then
    return jsonb_build_object('status', 'password_required', 'label', s.label);
  end if;

  select * into b from public.businesses where id = s.business_id;
  if b.visibility = 'private' then return jsonb_build_object('status', 'invalid'); end if;

  insert into public.share_link_views (share_link_id, viewer_email, ip_hash, user_agent, referrer)
  values (s.id, left(p_viewer_email, 200), p_ip_hash, left(p_user_agent, 300), left(p_referrer, 300));

  select coalesce(jsonb_agg(jsonb_build_object(
           'source', f.source, 'loan_subtype', f.loan_subtype, 'amount', f.amount, 'year', f.year,
           'program_name', f.program_name, 'department', f.department) order by f.year desc nulls last), '[]'::jsonb)
    into v_history from public.funding_history f where f.business_id = b.id;
  select coalesce(jsonb_agg(distinct d.kind), '[]'::jsonb) into v_docs from public.documents d where d.business_id = b.id;

  return jsonb_build_object('status', 'ok', 'snapshot', jsonb_build_object(
    'name', b.name, 'website', b.website, 'industry', b.industry, 'province', b.province, 'city', b.city,
    'years_in_business', b.years_in_business, 'stage', b.stage, 'amount_sought', b.amount_sought,
    'timeline', b.timeline, 'use_of_funds', b.use_of_funds, 'hire_roles', b.hire_roles,
    'annual_revenue', b.annual_revenue, 'readiness_score', b.readiness_score,
    'funding_history', v_history, 'documents', v_docs));
end $$;
grant execute on function public.fl_open_share(text, text, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private documents bucket, path = {business_id}/{file}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 26214400,
        array['application/pdf',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'application/vnd.ms-powerpoint',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-excel', 'text/csv'])
on conflict (id) do nothing;

create policy documents_bucket_owner_rw on storage.objects for all to authenticated
  using (bucket_id = 'documents' and public.owns_business(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'documents' and public.owns_business(((storage.foldername(name))[1])::uuid));
create policy documents_bucket_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_admin());

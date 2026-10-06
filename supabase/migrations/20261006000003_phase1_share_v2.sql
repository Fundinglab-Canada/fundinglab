-- Funding Lab — Phase 1: shareable profile v2 (adds description and traction to the shared snapshot).
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
    'description', b.description, 'revenue_12m', b.revenue_12m, 'growth_rate_pct', b.growth_rate_pct,
    'customers', b.customers, 'key_metrics', b.key_metrics, 'team', b.team, 'employees', b.employees,
    'funding_history', v_history, 'documents', v_docs));
end $$;

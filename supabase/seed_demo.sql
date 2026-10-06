-- Demo data for local development (§17): 5 fictional businesses across stages and industries,
-- sample matches (suggested / introduced / connected) and deals so every dashboard has something to show.
-- Demo owners have no password and can't sign in; they exist to populate admin and partner views.
-- Never run against production.

insert into auth.users (id, email, raw_user_meta_data) values
  ('d0000000-0000-0000-0000-000000000001', 'demo-idea@example.com',      '{"full_name":"Sam Idea (demo)"}'),
  ('d0000000-0000-0000-0000-000000000002', 'demo-seed@example.com',      '{"full_name":"Riley Seed (demo)"}'),
  ('d0000000-0000-0000-0000-000000000003', 'demo-growth@example.com',    '{"full_name":"Jordan Growth (demo)"}'),
  ('d0000000-0000-0000-0000-000000000004', 'demo-expansion@example.com', '{"full_name":"Casey Expansion (demo)"}'),
  ('d0000000-0000-0000-0000-000000000005', 'demo-exit@example.com',      '{"full_name":"Morgan Exit (demo)"}')
on conflict (id) do nothing;
update public.profiles set onboarded = true where email like 'demo-%@example.com';

insert into public.businesses (id, owner_id, slug, name, industry, province, city, legal_structure, stage, amount_sought, timeline, use_of_funds,
  description, revenue_12m, customers, growth_rate_pct, employees, profile_step, readiness_score, profile_completeness, consent_matching, consent_matching_at, contact_name, contact_email)
values
  ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'tidepool-apps-demo', 'Tidepool Apps (demo)', 'software', 'BC', 'Victoria', 'corporation', 'idea', 150000, '3–6 months',
   '{product_development,hire_staff}', 'Scheduling software for independent physiotherapy clinics. Concept validated with 12 clinic interviews.', null, 0, null, 2, 4, 28, 36, true, now(), 'Sam Idea', 'demo-idea@example.com'),
  ('b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'sproutline-foods-demo', 'Sproutline Foods (demo)', 'agrifood', 'BC', 'Abbotsford', 'corporation', 'seed', 400000, '6–12 months',
   '{inventory_equipment,marketing,export_expansion}', 'Plant-based frozen meals sold in 40 independent grocers across B.C.', 620000, 40, 85, 9, 7, 58, 73, true, now(), 'Riley Seed', 'demo-seed@example.com'),
  ('b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'ironwood-robotics-demo', 'Ironwood Robotics (demo)', 'advanced_manufacturing', 'BC', 'Burnaby', 'corporation', 'growth', 1500000, '3–6 months',
   '{hire_staff,rd,ip_patent}', 'Robotic welding cells for mid-size fabricators; 11 systems deployed in B.C. and Alberta.', 2400000, 11, 60, 24, 7, 76, 91, true, now(), 'Jordan Growth', 'demo-growth@example.com'),
  ('b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 'brightgrid-energy-demo', 'BrightGrid Energy (demo)', 'cleantech', 'AB', 'Calgary', 'corporation', 'expansion', 5000000, '6–12 months',
   '{inventory_equipment,working_capital,export_expansion}', 'Commercial battery storage installer with a recurring monitoring business.', 9800000, 180, 35, 61, 7, 81, 82, true, now(), 'Casey Expansion', 'demo-expansion@example.com'),
  ('b0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 'harbour-home-goods-demo', 'Harbour Home Goods (demo)', 'retail', 'BC', 'Nanaimo', 'corporation', 'exit', 8000000, '12+ months',
   '{partner_buyout}', 'Three-location home goods retailer with e-commerce; founder planning succession.', 14500000, 25000, 8, 74, 7, 72, 82, true, now(), 'Morgan Exit', 'demo-exit@example.com')
on conflict (id) do nothing;

insert into public.funding_history (business_id, source, amount, year, provider_name, status) values
  ('b0000000-0000-0000-0000-000000000002', 'grant_provincial', 50000, 2025, 'B.C. agrifood program (sample)', 'received'),
  ('b0000000-0000-0000-0000-000000000003', 'angel', 350000, 2023, 'Angel group (sample)', 'received'),
  ('b0000000-0000-0000-0000-000000000003', 'business_loan', 250000, 2024, 'Credit union (sample)', 'active'),
  ('b0000000-0000-0000-0000-000000000004', 'venture_capital', 3000000, 2023, 'Climate fund (sample)', 'received');

-- Matches: one suggested, one introduced (waiting), one connected → deal.
insert into public.matches (business_id, partner_id, score, reasons, status, source, approved_at, expires_at, business_opt_in, partner_opt_in)
select 'b0000000-0000-0000-0000-000000000003'::uuid, id, 85::smallint, '{stage,industry,geography,"cheque range"}'::text[], 'suggested'::public.match_status, 'engine', null::timestamptz, null::timestamptz, null::boolean, null::boolean
  from public.partners where type = 'venture_capital' and display_name like '%(sample)'
union all
select 'b0000000-0000-0000-0000-000000000003', id, 95, '{stage,"any industry","Canada-wide","service fit","hiring → wage subsidies"}', 'approved', 'engine', now() - interval '2 days', now() + interval '12 days', true, null
  from public.partners where type = 'grant_writer' and display_name like '%(sample)'
union all
select 'b0000000-0000-0000-0000-000000000002', id, 80, '{stage,geography,"cheque range"}', 'mutual', 'engine', now() - interval '9 days', now() + interval '5 days', true, true
  from public.partners where type = 'lending_partner' and display_name like '%(sample)'
on conflict (business_id, partner_id) do nothing;

insert into public.deals (match_id, business_id, partner_id, deal_type, status, expected_amount, commission_rate)
select m.id, m.business_id, m.partner_id, 'lending_partner', 'in_discussion', 400000, 0.015
from public.matches m where m.status = 'mutual' and m.business_id = 'b0000000-0000-0000-0000-000000000002'
on conflict (match_id) do nothing;

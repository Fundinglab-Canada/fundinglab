-- Local development seed. Fictional partners only — no real people or firms.
-- Programs (REDIP, RTRI + 18 samples) are in seed_programs.sql (generated).
-- To make yourself an admin after signing up locally:
--   update public.profiles set role = 'admin' where email = 'you@example.com';

-- 13 sample partners: one per partner type, including Recruitment Partner (§17)
with p as (
  insert into public.partners (type, status, display_name, company, contact_person, contact_email, location, bio, details, success_fee_rate)
  values
    ('crowdfunding_platform', 'active', 'Backyard Raise (sample)', 'Backyard Raise', 'Tom N.', 'tom@example.com', 'Toronto, ON',
     'Equity and reward crowdfunding for consumer brands.', '{"platform_type":["equity","reward"],"raise_min":25000,"raise_max":1500000,"fees":"6% success fee"}', 0.03),
    ('angel_investor', 'active', 'Priya S. (sample)', null, 'Priya S.', 'priya@example.com', 'Surrey, BC',
     'Operator-angel in manufacturing and health.', '{"accredited":true,"previous_investments":14,"average_cheque":100000,"capital_available":600000}', 0.04),
    ('venture_capital', 'active', 'Harbourline Ventures (sample)', 'Harbourline Ventures', 'Dana O.', 'dana@example.com', 'Vancouver, BC',
     'Seed and Series A in industrial automation and climate hardware.', '{"thesis":"Industrial automation and climate hardware with software margins","fund_size":85000000,"cheque_min":500000,"cheque_max":3000000}', 0.03),
    ('private_equity', 'active', 'Summit Ridge Equity (sample)', 'Summit Ridge Equity', 'Claire B.', 'claire@example.com', 'Calgary, AB',
     'Growth equity and succession for profitable western Canadian companies.', '{"fund_size":240000000,"cheque_min":3000000,"cheque_max":25000000}', 0.01),
    ('grant_writer', 'active', 'Granite Grant Partners (sample)', 'Granite Grant Partners', 'Lena W.', 'lena@example.com', 'Vancouver, BC',
     'IRAP, CanExport, PacifiCan and wage-subsidy applications.', '{"grants_written":210,"years_experience":11,"success_rate":0.78}', 0.10),
    ('lending_partner', 'active', 'Valley Credit Union – Business (sample)', 'Valley Credit Union', 'Mark L.', 'mark@example.com', 'Abbotsford, BC',
     'Term, CSBFP, equipment and operating lines for B.C. businesses.', '{"loan_types":["term","bank_csbfp","equipment","line_of_credit"],"loan_min":100000,"loan_max":2000000}', 0.015),
    ('ipo_expert', 'active', 'Northstar Listings (sample)', 'Northstar Listings', 'Ravi K.', 'ravi@example.com', 'Vancouver, BC',
     'Go-public readiness for TSXV and CSE listings.', '{"years_experience":15}', 0.02),
    ('ma_expert', 'active', 'Keel M&A Advisory (sample)', 'Keel M&A Advisory', 'Sophie D.', 'sophie@example.com', 'Victoria, BC',
     'Sell-side advisory for owner-operated businesses.', '{"deal_min":2000000,"deal_max":40000000,"side":["sell_side"]}', 0.02),
    ('development_expert', 'active', 'Cedar Labs (sample)', 'Cedar Labs', 'Jon P.', 'jon@example.com', 'Kelowna, BC',
     'Web apps, mobile apps and AI automation.', '{"specialties":["web","app","ai"],"rates":"$120–150/hr"}', 0.10),
    ('marketing_expert', 'active', 'Tidewater Growth (sample)', 'Tidewater Growth', 'Mei L.', 'mei@example.com', 'Vancouver, BC',
     'Meta and Google ads, SEO and export-market campaigns.', '{"channels":["meta","google","social"],"rates":"Retainers from $2,500/month"}', 0.10),
    ('commercial_lawyer', 'active', 'Halden IP Law (sample)', 'Halden IP Law', 'Rohan M.', 'rohan@example.com', 'Vancouver, BC',
     'Patents, financings and commercial contracts.', '{"practice_areas":"Patents, financings, commercial contracts","jurisdiction":"BC, ON"}', 0.10),
    ('fractional_cpa', 'active', 'Ledgerline CPA (sample)', 'Ledgerline CPA', 'Amrit G.', 'amrit@example.com', 'Pitt Meadows, BC',
     'Grant-ready financials, SR&ED claims and grant claims.', '{"services":"Bookkeeping, tax, SR&ED, grant claims","rates":"$145/hr"}', 0.10),
    ('recruiter', 'pending', 'Fraser Talent (sample)', 'Fraser Talent', 'Kim T.', 'kim@example.com', 'Burnaby, BC',
     'Engineering and sales hires for growth-stage companies.', '{"specialties":"Engineering, sales","placement_types":["permanent","contract"],"regions":"BC, AB","fee_model":"18% of first-year salary","wage_subsidy_experience":true}', 0.10)
  returning id, type
)
insert into public.partner_criteria (partner_id, stages, industries, provinces, min_amount, max_amount, uses_of_funds)
select id,
  case type
    when 'crowdfunding_platform' then '{idea,preseed,seed}'
    when 'angel_investor' then '{preseed,seed,growth}'
    when 'venture_capital' then '{seed,growth}'
    when 'private_equity' then '{expansion,exit}'
    when 'lending_partner' then '{growth,expansion,exit}'
    when 'ipo_expert' then '{exit}'
    when 'ma_expert' then '{expansion,exit}'
    else '{preseed,seed,growth,expansion}' end::public.business_stage[],
  case type
    when 'venture_capital' then '{advanced_manufacturing,cleantech,software}'
    when 'angel_investor' then '{advanced_manufacturing,health}'
    when 'private_equity' then '{advanced_manufacturing,consumer}'
    when 'crowdfunding_platform' then '{consumer,agrifood,retail}'
    else '{}' end::text[],
  case type
    when 'venture_capital' then '{BC,AB}' when 'private_equity' then '{AB,BC,SK}'
    when 'lending_partner' then '{BC}' when 'angel_investor' then '{BC}' else '{}' end::text[],
  case type when 'venture_capital' then 500000 when 'angel_investor' then 50000 when 'lending_partner' then 100000
    when 'private_equity' then 3000000 when 'crowdfunding_platform' then 25000 when 'ma_expert' then 2000000 end,
  case type when 'venture_capital' then 3000000 when 'angel_investor' then 250000 when 'lending_partner' then 2000000
    when 'private_equity' then 25000000 when 'crowdfunding_platform' then 1500000 when 'ma_expert' then 40000000 end,
  case type
    when 'grant_writer' then '{hire_staff,rd}' when 'commercial_lawyer' then '{ip_patent,partner_buyout}'
    when 'fractional_cpa' then '{rd,working_capital}' when 'development_expert' then '{product_development}'
    when 'marketing_expert' then '{marketing,export_expansion}' when 'recruiter' then '{hire_staff}'
    when 'ma_expert' then '{partner_buyout}' when 'lending_partner' then '{inventory_equipment,working_capital}' else '{}' end::text[]
from p;

-- About page: founders and advisors (§4B). Bios stay as placeholders until supplied — never invented.
insert into public.team_members (name, title, member_group, bio, sort_order) values
  ('Mike Qureshi', 'Co-founder & CEO', 'founder', '[Bio to be added]', 2),
  ('Saranvir Thiara', 'Advisor', 'advisor', '[Bio to be added]', 10),
  ('Beata Jirava', 'Advisor', 'advisor', '[Bio to be added]', 11),
  ('Bob Minhas', 'Advisor', 'advisor', '[Bio to be added]', 12);

insert into public.site_content (key, value) values
  ('about_story', 'Our founders spent years in B.C.''s startup, angel and venture ecosystem and kept seeing the same thing: good businesses missing funding they qualified for, because programs were scattered, the language was confusing, and the right investors and lenders were hard to reach. Funding Lab puts the whole journey in one place.'),
  ('cohort_refund_policy', 'Full refund if you withdraw before the first class. After the first class, you can transfer once to a later cohort.')
on conflict (key) do nothing;

-- Top announcement bar rotation (§4D-E, §4G)
insert into public.announcements (message, href, sort_order) values
  ('Next free Funding Webinar: Tuesday 8 AM PT — Reserve your seat.', '/webinar', 1),
  ('REDIP Intake 5 closes Nov 20 — check your fit.', '/grants/redip', 2),
  ('Hit by U.S. tariffs? RTRI is open now.', '/grants/rtri', 3);

-- First Road to Funding cohort (start date must be a Friday). Sessions are generated by trigger.
insert into public.cohorts (name, start_date, capacity, registration_deadline, status)
values ('Road to Funding — Jan 2027', '2027-01-08', 25, '2027-01-04', 'open');

-- Sample job posts (§4C)
insert into public.jobs (title, slug, department, job_type, location, remote_option, description, responsibilities, requirements, nice_to_have, status, posted_at, closes_at)
values
  ('Funding Advisor', 'funding-advisor', 'Funding Advisory', 'full_time', 'Metro Vancouver, BC', 'hybrid',
   'Guide Canadian businesses to the right mix of grants, loans and investment, from first call to funded.',
   '{"Run fit calls with businesses","Build funding roadmaps and application plans","Coordinate with grant writers and lending partners"}',
   '{"3+ years in banking, grants, or startup advisory","Plain-language communicator"}',
   '{"Experience with IRAP, CanExport or PacifiCan programs"}', 'open', now(), now() + interval '45 days'),
  ('Grant Writer (Contract)', 'grant-writer-contract', 'Grant Writing', 'contract', 'Remote, Canada', 'remote',
   'Write and manage federal and B.C. grant applications for Funding Lab clients.',
   '{"Draft applications and budgets","Assemble supporting documents","Track deadlines and reporting"}',
   '{"Track record of funded applications","Strong written English"}',
   '{"French"}', 'open', now(), null),
  ('Regional Ambassador', 'regional-ambassador', 'Business Development & Partnerships', 'ambassador', 'Anywhere in B.C.', 'remote',
   'Represent Funding Lab in your community and connect local businesses to funding.',
   '{"Host local info sessions","Refer businesses and partners"}', '{"Strong local network"}', '{}', 'open', now(), null);

-- A tiny grants sample so the lookup works before the first ETL run (illustrative records).
insert into public.grants_mirror (owner_org, ref_number, amendment_number, agreement_type, recipient_type, recipient_legal_name,
  recipient_operating_name, recipient_province, recipient_city, prog_name_en, owner_org_title, agreement_value, agreement_start_date, description_en)
values
  ('nrc-cnrc', 'SAMPLE-172-2024-Q1-994120', 1, 'C', 'F', 'Northwind Robotics Inc.', 'Northwind Robotics', 'BC', 'Burnaby',
   'Industrial Research Assistance Program – Contributions to Firms', 'National Research Council Canada', 148500, '2024-06-03',
   'Development of a vision-guided robotic cell for small-batch metal fabrication.'),
  ('dfatd-maecd', 'SAMPLE-019-2024-Q4-31877', 0, 'C', 'F', 'Northwind Robotics Inc.', null, 'BC', 'Burnaby',
   'CanExport SMEs', 'Global Affairs Canada', 37200, '2025-02-11',
   'Market development in the U.S. Pacific Northwest and Germany.'),
  ('nrc-cnrc', 'SAMPLE-172-2025-Q2-1011876', 0, 'C', 'F', 'Coastal Biologics Ltd.', null, 'BC', 'Victoria',
   'Industrial Research Assistance Program – Contributions to Firms', 'National Research Council Canada', 86000, '2025-08-14',
   'Scale-up of kelp-derived bioplastic resin formulation.')
on conflict do nothing;

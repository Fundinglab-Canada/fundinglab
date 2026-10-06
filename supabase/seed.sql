-- Local development seed. Sample partners only — no real people or firms.
-- To make yourself an admin after signing up locally:
--   update public.profiles set role = 'admin' where email = 'you@example.com';

with p as (
  insert into public.partners (type, status, display_name, company, contact_person, contact_email, location, bio, details, success_fee_rate)
  values
    ('venture_capital', 'active', 'Harbourline Ventures (sample)', 'Harbourline Ventures', 'Dana Okafor', 'dana@example.com', 'Vancouver, BC',
     'Seed and Series A in industrial automation and climate hardware.',
     '{"thesis":"Industrial automation and climate hardware with software margins","fund_size":85000000,"cheque_min":500000,"cheque_max":3000000}', 0.03),
    ('angel_investor', 'active', 'Priya S. (sample)', null, 'Priya S.', 'priya@example.com', 'Surrey, BC',
     'Operator-angel in manufacturing and health.',
     '{"accredited":true,"previous_investments":14,"average_cheque":100000,"capital_available":600000}', 0.04),
    ('lending_partner', 'active', 'Valley Credit Union – Business (sample)', 'Valley Credit Union', 'Mark L.', 'mark@example.com', 'Abbotsford, BC',
     'Term, CSBFP, equipment and operating lines for BC businesses.',
     '{"loan_types":["term","bank_csbfp","equipment","line_of_credit"],"loan_min":100000,"loan_max":2000000}', 0.015),
    ('grant_writer', 'active', 'Granite Grant Partners (sample)', 'Granite Grant Partners', 'Lena W.', 'lena@example.com', 'Vancouver, BC',
     'IRAP, CanExport, PacifiCan and wage-subsidy applications.',
     '{"grants_written":210,"years_experience":11,"success_rate":0.78}', 0.10),
    ('commercial_lawyer', 'active', 'Halden IP Law (sample)', 'Halden IP Law', 'Rohan M.', 'rohan@example.com', 'Vancouver, BC',
     'Patents, financings and commercial contracts.',
     '{"practice_areas":["patents","financings","commercial"],"jurisdiction":["BC","ON"]}', 0.10),
    ('private_equity', 'active', 'Summit Ridge Equity (sample)', 'Summit Ridge Equity', 'Claire B.', 'claire@example.com', 'Calgary, AB',
     'Growth equity and succession for profitable western Canadian companies.',
     '{"fund_size":240000000,"cheque_min":3000000,"cheque_max":25000000}', 0.01)
  returning id, type
)
insert into public.partner_criteria (partner_id, stages, industries, provinces, min_amount, max_amount, uses_of_funds)
select id,
  case type
    when 'venture_capital' then '{seed,growth}'::public.business_stage[]
    when 'angel_investor' then '{preseed,seed,growth}'::public.business_stage[]
    when 'lending_partner' then '{growth,expansion,exit}'::public.business_stage[]
    when 'grant_writer' then '{idea,preseed,seed,growth,expansion}'::public.business_stage[]
    when 'commercial_lawyer' then '{preseed,seed,growth,expansion}'::public.business_stage[]
    else '{expansion,exit}'::public.business_stage[] end,
  case type
    when 'venture_capital' then '{advanced_manufacturing,cleantech,software}'::text[]
    when 'angel_investor' then '{advanced_manufacturing,health}'::text[]
    when 'private_equity' then '{advanced_manufacturing,consumer}'::text[]
    else '{}'::text[] end,
  case type
    when 'venture_capital' then '{BC,AB}'::text[]
    when 'private_equity' then '{AB,BC,SK}'::text[]
    when 'grant_writer' then '{}'::text[]
    else '{BC}'::text[] end,
  case type when 'venture_capital' then 500000 when 'angel_investor' then 50000 when 'lending_partner' then 100000 when 'private_equity' then 3000000 end,
  case type when 'venture_capital' then 3000000 when 'angel_investor' then 250000 when 'lending_partner' then 2000000 when 'private_equity' then 25000000 end,
  case type when 'grant_writer' then '{hire_staff,rd}'::text[] when 'commercial_lawyer' then '{ip_patent}'::text[] else '{}'::text[] end
from p;

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

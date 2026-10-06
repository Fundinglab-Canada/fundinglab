-- Phase 1: enum additions. Kept in their own migration because new enum values
-- can't be used in the same transaction that adds them.
alter type public.partner_type add value if not exists 'recruiter';
alter type public.match_status add value if not exists 'expired';
alter type public.deal_status add value if not exists 'diligence' before 'term_sheet';
alter type public.deal_status add value if not exists 'approved' before 'funded';
alter type public.service_kind add value if not exists 'financial_model';
alter type public.service_kind add value if not exists 'pitch_deck';
alter type public.service_kind add value if not exists 'legal_cpa_review';
alter type public.service_kind add value if not exists 'hiring';
alter type public.service_kind add value if not exists 'development';
alter type public.service_kind add value if not exists 'marketing';
alter type public.service_kind add value if not exists 'cohort';
alter type public.document_kind add value if not exists 'tax_returns';
alter type public.document_kind add value if not exists 'cap_table';
alter type public.document_kind add value if not exists 'incorporation';

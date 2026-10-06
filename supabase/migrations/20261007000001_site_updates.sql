-- Site updates (Oct 2026): new service and document kinds, "Other" industry text, 15-minute meeting leads,
-- testimonial photos, and share links / visibility managed by admins only.

alter type public.service_kind add value if not exists 'ip_trademark';
alter type public.document_kind add value if not exists 'registration_noa';

-- Free-text industry when "Other" is chosen
alter table public.businesses add column if not exists industry_other text check (char_length(industry_other) <= 120);

-- Testimonial photo or avatar
alter table public.testimonials add column if not exists photo_url text;

-- "Book a 15-minute meeting" requests from service pages
alter table public.leads drop constraint if exists leads_kind_check;
alter table public.leads add constraint leads_kind_check
  check (kind in ('fit_call', 'quick_check', 'grant_teaser', 'assessment', 'guide_download', 'service_quote', 'meeting'));

-- Share links: admins create and revoke them; owners can still see links and views for their business.
drop policy if exists share_links_owner on public.share_links;
drop policy if exists share_links_admin on public.share_links;
create policy share_links_owner_read on public.share_links for select using (public.owns_business(business_id));
create policy share_links_admin on public.share_links for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.fl_create_share_link(
  p_business_id uuid, p_label text, p_expires_at timestamptz default null, p_password text default null
) returns table (id uuid, token text)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'Only Funding Lab admins can create share links'; end if;
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

-- Visibility is set by admins. Owners keep update rights on the rest of their profile.
create or replace function public.fl_guard_visibility() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.visibility is distinct from old.visibility and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only Funding Lab admins can change profile visibility';
  end if;
  return new;
end $$;
drop trigger if exists businesses_guard_visibility on public.businesses;
create trigger businesses_guard_visibility before update on public.businesses
  for each row execute function public.fl_guard_visibility();

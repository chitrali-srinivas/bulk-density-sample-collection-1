-- One table. Each row is one farmer plot, and that plot holds one sample.
-- Seed columns match the existing list. Sample columns start empty and are
-- filled when a surveyor submits. Submitting again updates the same row.
--
-- CSV headers for the seed import (do not include status):
-- farmer_name,farmer_id,village_id,village_name,base,field_type,plot_id,lat,long
--
-- Surveyor allowlist CSV:
-- email,name
--
-- status is managed by the app, not seeded:
--   pending   = no sample yet (default on insert)
--   enrolled  = sample collected for this plot (set by submit_sample)
--   rejected  = reserved for later review workflows
-- Farmer "Done" is computed in the app when every plot for that farmer is enrolled.
--
-- Auth: surveyors enter an @maticarbon.com email that must exist in public.surveyors.
-- No Supabase Auth passwords. submit_sample stamps surveyor_name from that list.

create extension if not exists pgcrypto;

create table if not exists public.surveyors (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint surveyors_email_unique unique (email)
);

create or replace function public.normalize_surveyor_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(btrim(new.email));
  new.name := btrim(new.name);
  if new.email is null or new.email = '' then
    raise exception 'Surveyor email is required';
  end if;
  if new.name is null or new.name = '' then
    raise exception 'Surveyor name is required';
  end if;
  if new.email !~* '@maticarbon\.com$' then
    raise exception 'Surveyor email must be a @maticarbon.com address';
  end if;
  return new;
end;
$$;

drop trigger if exists surveyors_normalize_email on public.surveyors;

create trigger surveyors_normalize_email
before insert or update on public.surveyors
for each row execute function public.normalize_surveyor_email();

create or replace function public.set_surveyors_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists surveyors_updated_at on public.surveyors;

create trigger surveyors_updated_at
before update on public.surveyors
for each row execute function public.set_surveyors_updated_at();

alter table public.surveyors enable row level security;

drop policy if exists "surveyors can read own row" on public.surveyors;

-- No broad read of the allowlist. Clients use RPCs below.

create table if not exists public.farmer_plots (
  id uuid primary key default gen_random_uuid(),
  farmer_name text not null,
  farmer_id text not null,
  village_id text not null,
  village_name text not null,
  base text not null,
  field_type text,
  plot_id text not null,
  lat double precision,
  long double precision,
  sample_id text,
  sample_date date,
  sample_picture_url text,
  core_cut_type text,
  sample_lat double precision,
  sample_long double precision,
  surveyor_name text,
  surveyor_email text,
  status text not null default 'pending',
  collected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint farmer_plots_one_sample_per_plot unique (farmer_id, plot_id),
  constraint farmer_plots_status_check check (status in ('pending', 'enrolled', 'rejected'))
);

alter table public.farmer_plots
  add column if not exists surveyor_name text;

alter table public.farmer_plots
  add column if not exists surveyor_email text;

create index if not exists farmer_plots_base_village_idx
  on public.farmer_plots (base, village_id);

create index if not exists farmer_plots_farmer_idx
  on public.farmer_plots (farmer_id);

-- CSV imports often send blank "" for unmapped columns. Coerce those to pending
-- so status does not need to be seeded.
create or replace function public.normalize_farmer_plot_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is null or btrim(new.status) = '' then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists farmer_plots_normalize_status on public.farmer_plots;

create trigger farmer_plots_normalize_status
before insert or update on public.farmer_plots
for each row execute function public.normalize_farmer_plot_status();

create or replace function public.set_farmer_plots_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists farmer_plots_updated_at on public.farmer_plots;

create trigger farmer_plots_updated_at
before update on public.farmer_plots
for each row execute function public.set_farmer_plots_updated_at();

create or replace function public.is_surveyor_email(p_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.surveyors s
    where s.email = lower(btrim(p_email))
      and s.active
      and lower(btrim(p_email)) ~* '@maticarbon\.com$'
  );
$$;

revoke all on function public.is_surveyor_email(text) from public;
grant execute on function public.is_surveyor_email(text) to anon, authenticated;

create or replace function public.get_surveyor_by_email(p_email text)
returns public.surveyors
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result public.surveyors;
  normalized text := lower(btrim(coalesce(p_email, '')));
begin
  if normalized = '' then
    raise exception 'Enter your work email';
  end if;
  if normalized !~* '@maticarbon\.com$' then
    raise exception 'Only @maticarbon.com emails can sign in';
  end if;

  select *
  into result
  from public.surveyors s
  where s.email = normalized
    and s.active
  limit 1;

  if result.id is null then
    raise exception 'This email is not on the surveyor list';
  end if;

  return result;
end;
$$;

revoke all on function public.get_surveyor_by_email(text) from public;
grant execute on function public.get_surveyor_by_email(text) to anon, authenticated;

drop function if exists public.current_surveyor();

alter table public.farmer_plots enable row level security;

drop policy if exists "surveyors can read plots" on public.farmer_plots;
drop policy if exists "allowlisted surveyors can read plots" on public.farmer_plots;

create policy "surveyors can read plots"
on public.farmer_plots
for select
to anon, authenticated
using (true);

grant select on public.farmer_plots to anon, authenticated;

-- Surveyors can only write the sample columns, through this function.
create or replace function public.submit_sample(
  p_id uuid,
  p_sample_id text,
  p_sample_date date,
  p_sample_picture_url text,
  p_core_cut_type text,
  p_sample_lat double precision,
  p_sample_long double precision,
  p_surveyor_email text
)
returns public.farmer_plots
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.farmer_plots;
  surveyor public.surveyors;
begin
  surveyor := public.get_surveyor_by_email(p_surveyor_email);

  if p_sample_id is null or length(btrim(p_sample_id)) = 0 then
    raise exception 'Sample ID is required';
  end if;
  if p_sample_date is null then
    raise exception 'Sample date is required';
  end if;
  if p_core_cut_type is null or length(btrim(p_core_cut_type)) = 0 then
    raise exception 'Core cut type is required';
  end if;
  if p_sample_lat is null or p_sample_long is null then
    raise exception 'Sample location is required';
  end if;

  update public.farmer_plots
  set
    sample_id = btrim(p_sample_id),
    sample_date = p_sample_date,
    sample_picture_url = nullif(btrim(coalesce(p_sample_picture_url, '')), ''),
    core_cut_type = btrim(p_core_cut_type),
    sample_lat = p_sample_lat,
    sample_long = p_sample_long,
    surveyor_name = surveyor.name,
    surveyor_email = surveyor.email,
    status = 'enrolled',
    collected_at = now()
  where id = p_id
  returning * into result;

  if result.id is null then
    raise exception 'Plot not found';
  end if;

  return result;
end;
$$;

drop function if exists public.submit_sample(uuid, text, date, text, text, double precision, double precision);

revoke all on function public.submit_sample(uuid, text, date, text, text, double precision, double precision, text) from public;
grant execute on function public.submit_sample(uuid, text, date, text, text, double precision, double precision, text) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('sample-photos', 'sample-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "surveyors can upload sample photos" on storage.objects;
drop policy if exists "allowlisted surveyors can upload sample photos" on storage.objects;
drop policy if exists "anyone can view sample photos" on storage.objects;

create policy "surveyors can upload sample photos"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'sample-photos');

create policy "anyone can view sample photos"
on storage.objects
for select
to public
using (bucket_id = 'sample-photos');

-- One table. Each row is one farmer plot, and that plot holds one sample.
-- Seed columns match the existing list. Sample columns start empty and are
-- filled when a surveyor submits. Submitting again updates the same row.
--
-- CSV headers for the seed import (do not include status):
-- farmer_name,farmer_id,village_id,village_name,base,field_type,plot_id,lat,long
--
-- status is managed by the app, not seeded:
--   pending   = no sample yet (default on insert)
--   enrolled  = sample collected for this plot (set by submit_sample)
--   rejected  = reserved for later review workflows
-- Farmer "Done" is computed in the app when every plot for that farmer is enrolled.

create extension if not exists pgcrypto;

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
  status text not null default 'pending',
  collected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint farmer_plots_one_sample_per_plot unique (farmer_id, plot_id),
  constraint farmer_plots_status_check check (status in ('pending', 'enrolled', 'rejected'))
);

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

alter table public.farmer_plots enable row level security;

drop policy if exists "surveyors can read plots" on public.farmer_plots;

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
  p_sample_long double precision
)
returns public.farmer_plots
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.farmer_plots;
begin
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

revoke all on function public.submit_sample(uuid, text, date, text, text, double precision, double precision) from public;
grant execute on function public.submit_sample(uuid, text, date, text, text, double precision, double precision) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('sample-photos', 'sample-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "surveyors can upload sample photos" on storage.objects;
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

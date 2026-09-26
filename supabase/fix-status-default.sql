-- Run this in the Supabase SQL editor, then import the CSV again.
-- Blank/missing status from the importer becomes pending automatically.
-- Seed only: farmer_name, farmer_id, village_id, village_name, base, field_type, plot_id, lat, long

alter table public.farmer_plots
  alter column status set default 'pending';

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

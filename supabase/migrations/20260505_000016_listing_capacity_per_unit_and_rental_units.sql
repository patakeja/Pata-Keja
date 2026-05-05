begin;

alter table public.listings
  add column if not exists booking_capacity_per_unit integer;

with default_capacity as (
  select greatest(1, coalesce((select booking_capacity_multiplier from public.finance_settings where id = 1), 1)) as value
)
update public.listings
set booking_capacity_per_unit = greatest(
  1,
  coalesce(
    booking_capacity_per_unit,
    case
      when available_units > 0 and max_active_bookings > 0
        then round(max_active_bookings::numeric / available_units)::integer
      else null
    end,
    (select value from default_capacity)
  )
)
where booking_capacity_per_unit is null;

update public.listings
set booking_capacity_per_unit = 1
where booking_capacity_per_unit is null;

alter table public.listings
  alter column booking_capacity_per_unit set default 1;

alter table public.listings
  alter column booking_capacity_per_unit set not null;

alter table public.listings
  drop constraint if exists listings_booking_capacity_per_unit_positive;

alter table public.listings
  add constraint listings_booking_capacity_per_unit_positive
  check (booking_capacity_per_unit >= 1);

create or replace function public.sync_listing_capacity_from_availability()
returns trigger
language plpgsql
as $$
declare
  v_capacity_per_unit integer := 1;
begin
  v_capacity_per_unit := greatest(1, coalesce(new.booking_capacity_per_unit, 1));
  new.booking_capacity_per_unit = v_capacity_per_unit;

  if new.available_units is null then
    new.available_units = new.total_units;
  end if;

  if new.available_units < 0 then
    raise exception 'available_units cannot be negative';
  end if;

  if new.available_units > new.total_units then
    raise exception 'available_units cannot exceed total_units';
  end if;

  new.max_active_bookings = new.available_units * v_capacity_per_unit;

  if tg_op = 'insert' and new.last_image_update_at is null then
    new.last_image_update_at = timezone('utc', now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_listings_sync_capacity on public.listings;
create trigger trg_listings_sync_capacity
before insert or update of total_units, available_units, booking_capacity_per_unit on public.listings
for each row
execute function public.sync_listing_capacity_from_availability();

drop trigger if exists trg_finance_settings_sync_listing_capacity on public.finance_settings;

update public.listings
set max_active_bookings = available_units * booking_capacity_per_unit
where max_active_bookings <> available_units * booking_capacity_per_unit;

alter table public.rental_events
  add column if not exists units_count integer;

update public.rental_events
set units_count = 1
where units_count is null;

alter table public.rental_events
  alter column units_count set default 1;

alter table public.rental_events
  alter column units_count set not null;

alter table public.rental_events
  drop constraint if exists rental_events_units_count_positive;

alter table public.rental_events
  add constraint rental_events_units_count_positive
  check (units_count >= 1);

alter table public.rental_events
  drop constraint if exists rental_events_platform_units_single;

alter table public.rental_events
  add constraint rental_events_platform_units_single
  check (source <> 'platform' or units_count = 1);

commit;

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'rental_source') then
    create type public.rental_source as enum ('platform', 'external');
  end if;
end
$$;

alter table public.users
  add column if not exists email text;

update public.users u
set email = lower(au.email)
from auth.users au
where au.id = u.id
  and au.email is not null
  and (u.email is null or btrim(u.email) = '');

alter table public.users
  drop constraint if exists users_email_not_blank;

alter table public.users
  add constraint users_email_not_blank
  check (char_length(btrim(email)) > 0);

alter table public.users
  alter column email set not null;

create unique index if not exists idx_users_email_unique
  on public.users (lower(email));

alter table public.finance_settings
  add column if not exists booking_capacity_multiplier integer not null default 1;

alter table public.finance_settings
  drop constraint if exists finance_settings_booking_capacity_multiplier_positive;

alter table public.finance_settings
  add constraint finance_settings_booking_capacity_multiplier_positive
  check (booking_capacity_multiplier >= 1);

update public.finance_settings
set booking_capacity_multiplier = greatest(1, coalesce(booking_capacity_multiplier, 1))
where id = 1;

insert into public.finance_settings (id, refund_percentage, booking_capacity_multiplier)
values (1, 0.9, 1)
on conflict (id) do nothing;

alter table public.listings
  add column if not exists available_units integer;

update public.listings
set available_units = total_units
where available_units is null;

alter table public.listings
  alter column available_units set default 1;

alter table public.listings
  alter column available_units set not null;

alter table public.listings
  add column if not exists available_from date;

alter table public.listings
  add column if not exists last_image_update_at timestamptz;

update public.listings
set last_image_update_at = coalesce(last_image_update_at, updated_at, created_at, timezone('utc', now()))
where last_image_update_at is null;

alter table public.listings
  alter column last_image_update_at set default timezone('utc', now());

alter table public.listings
  drop constraint if exists listings_available_units_non_negative;

alter table public.listings
  add constraint listings_available_units_non_negative
  check (available_units >= 0);

alter table public.listings
  drop constraint if exists listings_available_units_lte_total_units;

alter table public.listings
  add constraint listings_available_units_lte_total_units
  check (available_units <= total_units);

alter table public.listings
  drop constraint if exists listings_max_active_bookings_positive;

alter table public.listings
  add constraint listings_max_active_bookings_non_negative
  check (max_active_bookings >= 0);

create or replace function public.sync_listing_capacity_from_availability()
returns trigger
language plpgsql
as $$
declare
  v_multiplier integer := 1;
begin
  select fs.booking_capacity_multiplier
  into v_multiplier
  from public.finance_settings fs
  where fs.id = 1;

  v_multiplier := greatest(1, coalesce(v_multiplier, 1));

  if new.available_units is null then
    new.available_units = new.total_units;
  end if;

  if new.available_units < 0 then
    raise exception 'available_units cannot be negative';
  end if;

  if new.available_units > new.total_units then
    raise exception 'available_units cannot exceed total_units';
  end if;

  new.max_active_bookings = new.available_units * v_multiplier;

  if tg_op = 'insert' and new.last_image_update_at is null then
    new.last_image_update_at = timezone('utc', now());
  end if;

  return new;
end;
$$;

create or replace function public.touch_listing_images_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.image_paths is distinct from old.image_paths
    or new.cover_image is distinct from old.cover_image then
    new.last_image_update_at = timezone('utc', now());
  end if;

  return new;
end;
$$;

create or replace function public.sync_all_listing_capacity_from_settings()
returns trigger
language plpgsql
as $$
begin
  update public.listings
  set max_active_bookings = available_units * greatest(1, coalesce(new.booking_capacity_multiplier, 1))
  where max_active_bookings <> available_units * greatest(1, coalesce(new.booking_capacity_multiplier, 1));

  return new;
end;
$$;

drop trigger if exists trg_listings_sync_capacity on public.listings;
create trigger trg_listings_sync_capacity
before insert or update of total_units, available_units on public.listings
for each row
execute function public.sync_listing_capacity_from_availability();

drop trigger if exists trg_listings_touch_images_updated_at on public.listings;
create trigger trg_listings_touch_images_updated_at
before update of image_paths, cover_image on public.listings
for each row
execute function public.touch_listing_images_updated_at();

drop trigger if exists trg_finance_settings_sync_listing_capacity on public.finance_settings;
create trigger trg_finance_settings_sync_listing_capacity
after update of booking_capacity_multiplier on public.finance_settings
for each row
execute function public.sync_all_listing_capacity_from_settings();

update public.listings
set max_active_bookings = available_units * greatest(
  1,
  coalesce((select fs.booking_capacity_multiplier from public.finance_settings fs where fs.id = 1), 1)
);

create table if not exists public.rental_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  landlord_id uuid not null references public.users (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  source public.rental_source not null,
  notes text,
  admin_review_required boolean not null default false,
  admin_reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint rental_events_platform_requires_booking
    check (source <> 'platform' or booking_id is not null),
  constraint rental_events_admin_reviewed_after_creation
    check (admin_reviewed_at is null or admin_reviewed_at >= created_at)
);

create index if not exists idx_listings_available_units on public.listings (available_units);
create index if not exists idx_listings_available_from on public.listings (available_from);
create index if not exists idx_listings_last_image_update_at on public.listings (last_image_update_at);

create index if not exists idx_rental_events_landlord_id on public.rental_events (landlord_id);
create index if not exists idx_rental_events_listing_id on public.rental_events (listing_id);
create index if not exists idx_rental_events_admin_review_required on public.rental_events (admin_review_required, created_at desc);

drop trigger if exists trg_rental_events_set_updated_at on public.rental_events;
create trigger trg_rental_events_set_updated_at
before update on public.rental_events
for each row
execute function public.set_updated_at();

create or replace function public.enforce_active_booking_rules()
returns trigger
language plpgsql
as $$
declare
  v_max_active_bookings integer;
  v_hold_duration_hours integer;
  v_listing_is_active boolean;
  v_active_booking_count integer;
  v_available_units integer;
  v_available_from date;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select l.max_active_bookings, l.hold_duration_hours, l.is_active, l.available_units, l.available_from
  into v_max_active_bookings, v_hold_duration_hours, v_listing_is_active, v_available_units, v_available_from
  from public.listings l
  where l.id = new.listing_id
  for update;

  if not found then
    raise exception 'The requested listing does not exist.';
  end if;

  if not v_listing_is_active then
    raise exception 'This listing is not accepting new bookings.';
  end if;

  if v_available_units < 1 or v_max_active_bookings < 1 then
    raise exception 'No booking slots available';
  end if;

  if v_available_from is not null and v_available_from > current_date then
    raise exception 'This listing is coming soon and not yet available for booking.';
  end if;

  if v_hold_duration_hours < 1 then
    raise exception 'This listing has an invalid hold duration.';
  end if;

  if new.expires_at is null then
    new.expires_at = now() + make_interval(hours => v_hold_duration_hours);
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.user_id = new.user_id
      and b.listing_id = new.listing_id
      and b.status = 'active'
      and (tg_op = 'INSERT' or b.id <> new.id)
  ) then
    raise exception 'An active booking already exists for this user and listing.';
  end if;

  select count(*)
  into v_active_booking_count
  from public.bookings b
  where b.listing_id = new.listing_id
    and b.status = 'active'
    and (tg_op = 'INSERT' or b.id <> new.id);

  if v_active_booking_count >= v_max_active_bookings then
    raise exception 'No booking slots available';
  end if;

  return new;
end;
$$;

commit;

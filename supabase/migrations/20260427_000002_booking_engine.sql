begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_type') then
    create type public.payment_type as enum ('deposit', 'rent');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum ('platform', 'external');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'confirmed');
  end if;
end
$$;

alter table public.users
  add column if not exists commission_percentage numeric(5, 2) not null default 0;

alter table public.users
  drop constraint if exists users_commission_percentage_range;

alter table public.users
  add constraint users_commission_percentage_range
  check (commission_percentage between 0 and 100);

alter table public.listings
  add column if not exists total_units integer not null default 1;

alter table public.listings
  add column if not exists max_active_bookings integer not null default 1;

alter table public.listings
  add column if not exists deposit_amount numeric(12, 2) not null default 0;

alter table public.listings
  add column if not exists hold_duration_hours integer not null default 72;

alter table public.listings
  drop constraint if exists listings_total_units_positive;

alter table public.listings
  add constraint listings_total_units_positive
  check (total_units > 0);

alter table public.listings
  drop constraint if exists listings_max_active_bookings_positive;

alter table public.listings
  add constraint listings_max_active_bookings_positive
  check (max_active_bookings > 0);

alter table public.listings
  drop constraint if exists listings_deposit_amount_non_negative;

alter table public.listings
  add constraint listings_deposit_amount_non_negative
  check (deposit_amount >= 0);

alter table public.listings
  drop constraint if exists listings_hold_duration_hours_positive;

alter table public.listings
  add constraint listings_hold_duration_hours_positive
  check (hold_duration_hours > 0);

drop index if exists idx_bookings_one_active_entry_per_user_listing;

alter table public.bookings
  drop constraint if exists bookings_active_status_requires_expiry;

alter table public.bookings
  alter column status drop default;

create type public.booking_status_v2 as enum ('active', 'expired', 'completed');

alter table public.bookings
  alter column status type public.booking_status_v2
  using (
    case status::text
      when 'pending' then 'active'
      when 'reserved' then 'active'
      when 'expired' then 'expired'
      when 'completed' then 'completed'
      when 'cancelled' then 'expired'
      else 'active'
    end
  )::public.booking_status_v2;

drop type public.booking_status;

alter type public.booking_status_v2 rename to booking_status;

alter table public.bookings
  alter column status set default 'active';

alter table public.bookings
  add constraint bookings_active_status_requires_expiry
  check (status <> 'active' or expires_at is not null);

create or replace function public.enforce_active_booking_rules()
returns trigger
language plpgsql
as $$
declare
  v_max_active_bookings integer;
  v_hold_duration_hours integer;
  v_listing_is_active boolean;
  v_active_booking_count integer;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select l.max_active_bookings, l.hold_duration_hours, l.is_active
  into v_max_active_bookings, v_hold_duration_hours, v_listing_is_active
  from public.listings l
  where l.id = new.listing_id
  for update;

  if not found then
    raise exception 'The requested listing does not exist.';
  end if;

  if not v_listing_is_active then
    raise exception 'This listing is not accepting new bookings.';
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

drop trigger if exists trg_bookings_enforce_active_booking_rules on public.bookings;

create trigger trg_bookings_enforce_active_booking_rules
before insert or update of listing_id, user_id, status, expires_at on public.bookings
for each row
execute function public.enforce_active_booking_rules();

create unique index if not exists idx_bookings_one_active_entry_per_user_listing
  on public.bookings (user_id, listing_id)
  where status = 'active';

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete restrict,
  amount numeric(12, 2) not null,
  payment_type public.payment_type not null,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  commission_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payments_amount_non_negative check (amount >= 0),
  constraint payments_commission_amount_non_negative check (commission_amount >= 0),
  constraint payments_commission_amount_lte_amount check (commission_amount <= amount)
);

create index if not exists idx_payments_user_status on public.payments (user_id, status);
create index if not exists idx_payments_booking_status on public.payments (booking_id, status);

create unique index if not exists idx_payments_one_open_payment_per_booking_type
  on public.payments (booking_id, payment_type)
  where status in ('pending', 'confirmed');

drop trigger if exists trg_payments_set_updated_at on public.payments;

create trigger trg_payments_set_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

commit;

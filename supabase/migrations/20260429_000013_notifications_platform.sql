begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum ('message', 'booking', 'payment', 'system');
  end if;

  if not exists (select 1 from pg_type where typname = 'push_campaign_reach_type') then
    create type public.push_campaign_reach_type as enum ('area', 'town', 'county');
  end if;

  if not exists (select 1 from pg_type where typname = 'push_campaign_status') then
    create type public.push_campaign_status as enum ('active', 'paused', 'completed');
  end if;
end
$$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  read_at timestamptz,
  dedupe_key text,
  push_state text not null default 'pending',
  last_push_attempt_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notifications_title_not_blank check (char_length(btrim(title)) > 0),
  constraint notifications_body_not_blank check (char_length(btrim(body)) > 0),
  constraint notifications_data_is_object check (jsonb_typeof(data) = 'object'),
  constraint notifications_push_state_valid check (push_state in ('pending', 'sent', 'failed', 'skipped')),
  constraint notifications_read_at_consistency check (read_at is null or read = true)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null,
  keys jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_success_at timestamptz,
  last_error text,
  constraint push_subscriptions_endpoint_not_blank check (char_length(btrim(endpoint)) > 0),
  constraint push_subscriptions_keys_is_object check (jsonb_typeof(keys) = 'object')
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  county bigint references public.counties (id) on delete set null,
  town bigint references public.towns (id) on delete set null,
  area bigint references public.areas (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_preferences_requires_county_for_town check (town is null or county is not null),
  constraint user_preferences_requires_town_for_area check (area is null or town is not null),
  constraint user_preferences_county_town_consistency_fk
    foreign key (county, town)
    references public.towns (county_id, id)
    on delete set null,
  constraint user_preferences_town_area_consistency_fk
    foreign key (town, area)
    references public.areas (town_id, id)
    on delete set null
);

create table if not exists public.push_campaigns (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  landlord_id uuid not null references public.users (id) on delete cascade,
  reach_type public.push_campaign_reach_type not null,
  frequency_per_week integer not null,
  duration_days integer not null,
  price_total numeric(12, 2) not null,
  status public.push_campaign_status not null default 'paused',
  payment_status public.payment_status not null default 'pending',
  starts_at timestamptz,
  ends_at timestamptz,
  activated_at timestamptz,
  last_dispatched_at timestamptz,
  audience_size integer not null default 0,
  impressions_sent integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint push_campaigns_frequency_positive check (frequency_per_week between 1 and 14),
  constraint push_campaigns_duration_positive check (duration_days between 1 and 90),
  constraint push_campaigns_price_non_negative check (price_total >= 0),
  constraint push_campaigns_audience_non_negative check (audience_size >= 0),
  constraint push_campaigns_impressions_non_negative check (impressions_sent >= 0)
);

create table if not exists public.push_campaign_payments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.push_campaigns (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  amount numeric(12, 2) not null,
  status public.payment_status not null default 'pending',
  phone text,
  mpesa_receipt text,
  checkout_request_id text,
  merchant_request_id text,
  provider_result_code integer,
  provider_result_desc text,
  provider_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint push_campaign_payments_amount_non_negative check (amount >= 0),
  constraint push_campaign_payments_provider_response_is_object check (jsonb_typeof(provider_response) = 'object'),
  constraint push_campaign_payments_phone_not_blank check (phone is null or char_length(btrim(phone)) > 0),
  constraint push_campaign_payments_receipt_not_blank check (mpesa_receipt is null or char_length(btrim(mpesa_receipt)) > 0)
);

create table if not exists public.notification_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  subscription_id uuid references public.push_subscriptions (id) on delete set null,
  endpoint text not null,
  status text not null,
  response_status integer,
  response_body text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notification_push_deliveries_endpoint_not_blank check (char_length(btrim(endpoint)) > 0),
  constraint notification_push_deliveries_status_valid check (status in ('sent', 'failed', 'skipped'))
);

create index if not exists idx_notifications_user_created_at on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_user_read on public.notifications (user_id, read, created_at desc);
create index if not exists idx_notifications_push_state on public.notifications (push_state, created_at asc);
create unique index if not exists idx_notifications_user_dedupe_key
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

create unique index if not exists idx_push_subscriptions_endpoint on public.push_subscriptions (endpoint);
create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions (user_id);

create index if not exists idx_user_preferences_county on public.user_preferences (county);
create index if not exists idx_user_preferences_town on public.user_preferences (town);
create index if not exists idx_user_preferences_area on public.user_preferences (area);

create index if not exists idx_push_campaigns_landlord_status on public.push_campaigns (landlord_id, status, created_at desc);
create index if not exists idx_push_campaigns_dispatch_window on public.push_campaigns (status, payment_status, last_dispatched_at);
create index if not exists idx_push_campaigns_listing_id on public.push_campaigns (listing_id);

create index if not exists idx_push_campaign_payments_campaign_id on public.push_campaign_payments (campaign_id, created_at desc);
create index if not exists idx_push_campaign_payments_user_id on public.push_campaign_payments (user_id, created_at desc);
create unique index if not exists idx_push_campaign_payments_open_campaign
  on public.push_campaign_payments (campaign_id)
  where status in ('pending', 'confirmed', 'completed');
create unique index if not exists idx_push_campaign_payments_checkout_request_id
  on public.push_campaign_payments (checkout_request_id)
  where checkout_request_id is not null;
create unique index if not exists idx_push_campaign_payments_merchant_request_id
  on public.push_campaign_payments (merchant_request_id)
  where merchant_request_id is not null;

create index if not exists idx_notification_push_deliveries_notification_id
  on public.notification_push_deliveries (notification_id, created_at desc);

create or replace function public.is_admin_user(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = p_user_id
      and u.role = 'admin'
  );
$$;

create or replace function public.create_notification(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  if p_dedupe_key is null then
    insert into public.notifications (
      user_id,
      type,
      title,
      body,
      data
    )
    values (
      p_user_id,
      p_type,
      p_title,
      p_body,
      coalesce(p_data, '{}'::jsonb)
    )
    returning id into v_notification_id;

    return v_notification_id;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    dedupe_key
  )
  values (
    p_user_id,
    p_type,
    p_title,
    p_body,
    coalesce(p_data, '{}'::jsonb),
    p_dedupe_key
  )
  on conflict (user_id, dedupe_key)
  where dedupe_key is not null
  do nothing
  returning id into v_notification_id;

  if v_notification_id is not null then
    return v_notification_id;
  end if;

  select n.id
  into v_notification_id
  from public.notifications n
  where n.user_id = p_user_id
    and n.dedupe_key = p_dedupe_key
  order by n.created_at desc
  limit 1;

  return v_notification_id;
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set
    read = true,
    read_at = coalesce(read_at, timezone('utc', now()))
  where id = p_notification_id
    and user_id = auth.uid();

  return found;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_count integer := 0;
begin
  update public.notifications
  set
    read = true,
    read_at = coalesce(read_at, timezone('utc', now()))
  where user_id = auth.uid()
    and read = false;

  get diagnostics v_updated_count = row_count;

  return v_updated_count;
end;
$$;

create or replace function public.sync_user_notification_preferences()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.user_preferences (
    user_id,
    county,
    town,
    area
  )
  values (
    new.id,
    new.county_id,
    new.town_id,
    null
  )
  on conflict (user_id)
  do update
  set
    county = excluded.county,
    town = excluded.town,
    area =
      case
        when public.user_preferences.town = excluded.town then public.user_preferences.area
        else null
      end,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

create or replace function public.enqueue_listing_location_notifications()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not new.is_active then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    dedupe_key
  )
  select
    up.user_id,
    'system',
    'New house near you',
    format('A new listing in your preferred area is live: %s', new.title),
    jsonb_build_object(
      'type', 'listing',
      'listingId', new.id,
      'route', format('/listing/%s', new.id)
    ),
    format('listing-location:%s:%s', new.id, up.user_id)
  from public.user_preferences up
  where up.user_id <> new.landlord_id
    and up.county = new.county_id
    and up.town = new.town_id
    and (up.area is null or up.area = new.area_id)
  on conflict (user_id, dedupe_key)
  where dedupe_key is not null
  do nothing;

  return new;
end;
$$;

create or replace function public.enqueue_similar_listing_notifications()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not new.is_active then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    dedupe_key
  )
  select distinct
    sl.user_id,
    'system',
    'Similar house available',
    format('A similar %s listing just went live: %s', replace(new.house_type::text, '_', ' '), new.title),
    jsonb_build_object(
      'type', 'listing',
      'listingId', new.id,
      'route', format('/listing/%s', new.id)
    ),
    format('listing-similar:%s:%s', new.id, sl.user_id)
  from public.saved_listings sl
  inner join public.listings comparable_listing
    on comparable_listing.id = sl.listing_id
  where sl.user_id <> new.landlord_id
    and comparable_listing.id <> new.id
    and comparable_listing.listing_type = new.listing_type
    and comparable_listing.house_type = new.house_type
    and comparable_listing.price between new.price * 0.8 and new.price * 1.2
    and not exists (
      select 1
      from public.user_preferences up
      where up.user_id = sl.user_id
        and up.county = new.county_id
        and up.town = new.town_id
        and (up.area is null or up.area = new.area_id)
    )
  on conflict (user_id, dedupe_key)
  where dedupe_key is not null
  do nothing;

  return new;
end;
$$;

create or replace function public.enqueue_booking_notifications()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_listing_title text;
begin
  select l.title
  into v_listing_title
  from public.listings l
  where l.id = new.listing_id;

  if tg_op = 'INSERT' and new.status = 'active' then
    perform public.create_notification(
      new.user_id,
      'booking',
      'Booking confirmed',
      format('Your reservation for %s is active.', coalesce(v_listing_title, 'this house')),
      jsonb_build_object(
        'type', 'booking',
        'bookingId', new.id,
        'route', format('/bookings/%s', new.id)
      ),
      format('booking-confirmed:%s', new.id)
    );
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'expired' then
    perform public.create_notification(
      new.user_id,
      'booking',
      'Booking expired',
      format('Your hold on %s has expired.', coalesce(v_listing_title, 'this house')),
      jsonb_build_object(
        'type', 'booking',
        'bookingId', new.id,
        'route', format('/bookings/%s', new.id)
      ),
      format('booking-expired:%s', new.id)
    );
  end if;

  return new;
end;
$$;

create or replace function public.enqueue_house_unavailable_notifications()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' or old.available_units <= 0 or new.available_units > 0 then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    dedupe_key
  )
  select
    b.user_id,
    'booking',
    'This house is no longer available',
    format('%s has been taken by another renter.', new.title),
    jsonb_build_object(
      'type', 'booking',
      'bookingId', b.id,
      'listingId', new.id,
      'route', format('/bookings/%s', b.id)
    ),
    format('listing-unavailable:%s:%s', new.id, b.id)
  from public.bookings b
  where b.listing_id = new.id
    and b.status = 'active'
  on conflict (user_id, dedupe_key)
  where dedupe_key is not null
  do nothing;

  return new;
end;
$$;

create or replace function public.enqueue_message_notifications()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_booking_id uuid;
  v_sender_name text;
  v_preview text;
begin
  select c.booking_id, u.full_name
  into v_booking_id, v_sender_name
  from public.conversations c
  inner join public.users u
    on u.id = new.sender_id
  where c.id = new.conversation_id;

  v_preview := left(coalesce(new.original_content, new.content), 90);

  perform public.create_notification(
    new.receiver_id,
    'message',
    'New message',
    format('%s: %s', coalesce(v_sender_name, 'New chat'), v_preview),
    jsonb_build_object(
      'type', 'chat',
      'bookingId', v_booking_id,
      'conversationId', new.conversation_id,
      'route',
        case
          when v_booking_id is not null then format('/bookings/%s?tab=chat', v_booking_id)
          else '/notifications'
        end
    ),
    format('message:%s:%s', new.id, new.receiver_id)
  );

  return new;
end;
$$;

create or replace function public.enqueue_payment_notifications()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_booking_id uuid;
  v_listing_id uuid;
  v_listing_title text;
  v_retry_route text;
begin
  select b.id, l.id, l.title
  into v_booking_id, v_listing_id, v_listing_title
  from public.bookings b
  inner join public.listings l
    on l.id = b.listing_id
  where b.id = new.booking_id;

  v_retry_route :=
    case
      when new.payment_type = 'rent' then format('/bookings/%s/rent?retry=1', new.booking_id)
      when v_listing_id is not null then format('/deposit/%s?retry=1', v_listing_id)
      else '/notifications'
    end;

  if old.status is distinct from new.status and new.status in ('confirmed', 'completed') then
    if new.payment_type = 'rent' then
      perform public.create_notification(
        new.user_id,
        'payment',
        'Rent confirmed',
        format('Your rent payment for %s has been confirmed.', coalesce(v_listing_title, 'this house')),
        jsonb_build_object(
          'type', 'booking',
          'bookingId', v_booking_id,
          'route', format('/bookings/%s', v_booking_id)
        ),
        format('rent-confirmed:%s', new.id)
      );
    else
      perform public.create_notification(
        new.user_id,
        'payment',
        'Payment successful',
        format('Your deposit payment for %s has been received.', coalesce(v_listing_title, 'this house')),
        jsonb_build_object(
          'type', 'booking',
          'bookingId', v_booking_id,
          'route', format('/bookings/%s', v_booking_id)
        ),
        format('payment-success:%s', new.id)
      );
    end if;
  end if;

  if old.status is distinct from new.status and new.status = 'failed' then
    perform public.create_notification(
      new.user_id,
      'payment',
      'Payment failed',
      format('Your payment for %s failed. Retry to keep things moving.', coalesce(v_listing_title, 'this booking')),
      jsonb_build_object(
        'type', 'payment',
        'bookingId', v_booking_id,
        'listingId', v_listing_id,
        'route', v_retry_route
      ),
      format('payment-failed:%s', new.id)
    );
  end if;

  if (
    new.status = 'partially_refunded'
    and old.status is distinct from new.status
  ) or (
    coalesce(new.refund_amount, 0) > 0
    and coalesce(old.refund_amount, 0) <> coalesce(new.refund_amount, 0)
  ) then
    perform public.create_notification(
      new.user_id,
      'payment',
      'Refund issued',
      format('A refund for %s has been processed.', coalesce(v_listing_title, 'your booking')),
      jsonb_build_object(
        'type', 'booking',
        'bookingId', v_booking_id,
        'route', format('/bookings/%s', v_booking_id)
      ),
      format('refund-issued:%s', new.id)
    );
  end if;

  return new;
end;
$$;

create or replace function public.calculate_push_campaign_quote(
  p_listing_id uuid,
  p_reach_type public.push_campaign_reach_type,
  p_frequency_per_week integer,
  p_duration_days integer
)
returns table (
  audience_size bigint,
  estimated_impressions bigint,
  cpm numeric,
  price_total numeric,
  reach_label text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_listing_owner_id uuid;
  v_listing_county_id bigint;
  v_listing_town_id bigint;
  v_listing_area_id bigint;
  v_scope_label text := '';
  v_scope_cpm numeric(10, 2) := 0;
  v_audience bigint := 0;
begin
  if v_actor_id is null then
    raise exception 'Authentication is required to price a push campaign.';
  end if;

  if p_frequency_per_week < 1 or p_frequency_per_week > 14 then
    raise exception 'Frequency per week must be between 1 and 14.';
  end if;

  if p_duration_days < 1 or p_duration_days > 90 then
    raise exception 'Duration days must be between 1 and 90.';
  end if;

  select
    l.landlord_id,
    l.county_id,
    l.town_id,
    l.area_id
  into
    v_listing_owner_id,
    v_listing_county_id,
    v_listing_town_id,
    v_listing_area_id
  from public.listings l
  where l.id = p_listing_id;

  if not found then
    raise exception 'The selected listing does not exist.';
  end if;

  if v_actor_id <> v_listing_owner_id and not public.is_admin_user(v_actor_id) then
    raise exception 'You do not have access to create a campaign for this listing.';
  end if;

  if p_reach_type = 'area' then
    v_scope_cpm := 0.5;

    select a.name
    into v_scope_label
    from public.areas a
    where a.id = v_listing_area_id;

    select count(*)
    into v_audience
    from public.user_preferences up
    where up.area = v_listing_area_id
      and up.user_id <> v_listing_owner_id;
  elsif p_reach_type = 'town' then
    v_scope_cpm := 1.0;

    select t.name
    into v_scope_label
    from public.towns t
    where t.id = v_listing_town_id;

    select count(*)
    into v_audience
    from public.user_preferences up
    where up.town = v_listing_town_id
      and up.user_id <> v_listing_owner_id;
  else
    v_scope_cpm := 2.0;

    select c.name
    into v_scope_label
    from public.counties c
    where c.id = v_listing_county_id;

    select count(*)
    into v_audience
    from public.user_preferences up
    where up.county = v_listing_county_id
      and up.user_id <> v_listing_owner_id;
  end if;

  return query
  select
    v_audience,
    v_audience * p_frequency_per_week * p_duration_days,
    v_scope_cpm,
    round(((v_audience::numeric / 1000.0) * v_scope_cpm * p_frequency_per_week * p_duration_days)::numeric, 2),
    coalesce(v_scope_label, '');
end;
$$;

create or replace function public.enqueue_booking_expiry_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enqueued integer := 0;
begin
  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    dedupe_key
  )
  select
    b.user_id,
    'booking',
    'Booking expiring soon',
    format('Your hold on %s expires within 24 hours.', l.title),
    jsonb_build_object(
      'type', 'booking',
      'bookingId', b.id,
      'listingId', l.id,
      'route', format('/bookings/%s', b.id)
    ),
    format('booking-expiring:%s', b.id)
  from public.bookings b
  inner join public.listings l
    on l.id = b.listing_id
  where b.status = 'active'
    and b.expires_at is not null
    and b.expires_at > timezone('utc', now())
    and b.expires_at <= timezone('utc', now()) + interval '24 hours'
  on conflict (user_id, dedupe_key)
  where dedupe_key is not null
  do nothing;

  get diagnostics v_enqueued = row_count;

  return v_enqueued;
end;
$$;

create or replace function public.enqueue_unread_message_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enqueued integer := 0;
begin
  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    dedupe_key
  )
  select
    message_summary.receiver_id,
    'message',
    'Unread message reminder',
    format(
      'You still have %s unread message%s about %s.',
      message_summary.unread_count,
      case when message_summary.unread_count = 1 then '' else 's' end,
      message_summary.listing_title
    ),
    jsonb_build_object(
      'type', 'chat',
      'bookingId', message_summary.booking_id,
      'conversationId', message_summary.conversation_id,
      'route', format('/bookings/%s?tab=chat', message_summary.booking_id)
    ),
    format('message-reminder:%s', message_summary.conversation_id)
  from (
    select
      m.receiver_id,
      m.conversation_id,
      c.booking_id,
      l.title as listing_title,
      count(*) as unread_count,
      min(m.created_at) as oldest_unread_at
    from public.messages m
    inner join public.conversations c
      on c.id = m.conversation_id
    inner join public.listings l
      on l.id = c.listing_id
    where m.status in ('sent', 'delivered')
    group by m.receiver_id, m.conversation_id, c.booking_id, l.title
  ) as message_summary
  where message_summary.booking_id is not null
    and message_summary.oldest_unread_at <= timezone('utc', now()) - interval '6 hours'
  on conflict (user_id, dedupe_key)
  where dedupe_key is not null
  do nothing;

  get diagnostics v_enqueued = row_count;

  return v_enqueued;
end;
$$;

create or replace function public.complete_expired_push_campaigns()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completed integer := 0;
begin
  update public.push_campaigns
  set
    status = 'completed',
    updated_at = timezone('utc', now())
  where payment_status = 'completed'
    and status <> 'completed'
    and ends_at is not null
    and ends_at <= timezone('utc', now());

  get diagnostics v_completed = row_count;

  return v_completed;
end;
$$;

create or replace function public.process_due_push_campaigns()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign record;
  v_scope_label text;
  v_dispatched integer := 0;
  v_total_dispatched integer := 0;
  v_interval_hours integer;
begin
  perform public.complete_expired_push_campaigns();

  for v_campaign in
    select
      c.id,
      c.listing_id,
      c.landlord_id,
      c.reach_type,
      c.frequency_per_week,
      c.duration_days,
      c.last_dispatched_at,
      c.ends_at,
      l.title,
      l.county_id,
      l.town_id,
      l.area_id
    from public.push_campaigns c
    inner join public.listings l
      on l.id = c.listing_id
    where c.status = 'active'
      and c.payment_status = 'completed'
      and (c.ends_at is null or c.ends_at > timezone('utc', now()))
  loop
    v_interval_hours := greatest(1, floor(168.0 / greatest(v_campaign.frequency_per_week, 1))::integer);

    if v_campaign.last_dispatched_at is not null
      and v_campaign.last_dispatched_at > timezone('utc', now()) - make_interval(hours => v_interval_hours) then
      continue;
    end if;

    v_scope_label :=
      case v_campaign.reach_type
        when 'area' then (
          select a.name
          from public.areas a
          where a.id = v_campaign.area_id
        )
        when 'town' then (
          select t.name
          from public.towns t
          where t.id = v_campaign.town_id
        )
        else (
          select c.name
          from public.counties c
          where c.id = v_campaign.county_id
        )
      end;

    insert into public.notifications (
      user_id,
      type,
      title,
      body,
      data,
      dedupe_key
    )
    select
      up.user_id,
      'system',
      format('Featured house in %s', coalesce(v_scope_label, 'your area')),
      format('%s is being promoted for renters like you.', v_campaign.title),
      jsonb_build_object(
        'type', 'listing',
        'listingId', v_campaign.listing_id,
        'campaignId', v_campaign.id,
        'route', format('/listing/%s', v_campaign.listing_id)
      ),
      format(
        'campaign:%s:%s:%s',
        v_campaign.id,
        to_char(date_trunc('hour', timezone('utc', now())), 'YYYYMMDDHH24'),
        up.user_id
      )
    from public.user_preferences up
    where up.user_id <> v_campaign.landlord_id
      and (
        (v_campaign.reach_type = 'area' and up.area = v_campaign.area_id)
        or (v_campaign.reach_type = 'town' and up.town = v_campaign.town_id)
        or (v_campaign.reach_type = 'county' and up.county = v_campaign.county_id)
      )
    on conflict (user_id, dedupe_key)
    where dedupe_key is not null
    do nothing;

    get diagnostics v_dispatched = row_count;

    update public.push_campaigns
    set
      last_dispatched_at = timezone('utc', now()),
      impressions_sent = impressions_sent + v_dispatched,
      updated_at = timezone('utc', now())
    where id = v_campaign.id;

    v_total_dispatched := v_total_dispatched + v_dispatched;
  end loop;

  return v_total_dispatched;
end;
$$;

create or replace function public.notification_hourly_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_reminders integer := 0;
  v_message_reminders integer := 0;
  v_campaign_notifications integer := 0;
  v_completed_campaigns integer := 0;
begin
  v_booking_reminders := public.enqueue_booking_expiry_reminders();
  v_message_reminders := public.enqueue_unread_message_reminders();
  v_completed_campaigns := public.complete_expired_push_campaigns();
  v_campaign_notifications := public.process_due_push_campaigns();

  return jsonb_build_object(
    'bookingReminders', v_booking_reminders,
    'messageReminders', v_message_reminders,
    'campaignNotifications', v_campaign_notifications,
    'completedCampaigns', v_completed_campaigns
  );
end;
$$;

insert into public.user_preferences (
  user_id,
  county,
  town,
  area
)
select
  u.id,
  u.county_id,
  u.town_id,
  null
from public.users u
on conflict (user_id)
do nothing;

drop trigger if exists trg_push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_updated_at();

drop trigger if exists trg_user_preferences_set_updated_at on public.user_preferences;
create trigger trg_user_preferences_set_updated_at
before update on public.user_preferences
for each row
execute function public.set_updated_at();

drop trigger if exists trg_push_campaigns_set_updated_at on public.push_campaigns;
create trigger trg_push_campaigns_set_updated_at
before update on public.push_campaigns
for each row
execute function public.set_updated_at();

drop trigger if exists trg_push_campaign_payments_set_updated_at on public.push_campaign_payments;
create trigger trg_push_campaign_payments_set_updated_at
before update on public.push_campaign_payments
for each row
execute function public.set_updated_at();

drop trigger if exists trg_users_sync_notification_preferences on public.users;
create trigger trg_users_sync_notification_preferences
after insert or update of county_id, town_id on public.users
for each row
execute function public.sync_user_notification_preferences();

drop trigger if exists trg_listings_location_notifications on public.listings;
create trigger trg_listings_location_notifications
after insert on public.listings
for each row
execute function public.enqueue_listing_location_notifications();

drop trigger if exists trg_listings_similar_notifications on public.listings;
create trigger trg_listings_similar_notifications
after insert on public.listings
for each row
execute function public.enqueue_similar_listing_notifications();

drop trigger if exists trg_bookings_notification_fanout on public.bookings;
create trigger trg_bookings_notification_fanout
after insert or update of status on public.bookings
for each row
execute function public.enqueue_booking_notifications();

drop trigger if exists trg_messages_notification_fanout on public.messages;
create trigger trg_messages_notification_fanout
after insert on public.messages
for each row
execute function public.enqueue_message_notifications();

drop trigger if exists trg_payments_notification_fanout on public.payments;
create trigger trg_payments_notification_fanout
after update of status, refund_amount on public.payments
for each row
execute function public.enqueue_payment_notifications();

drop trigger if exists trg_listings_unavailable_notifications on public.listings;
create trigger trg_listings_unavailable_notifications
after update of available_units on public.listings
for each row
execute function public.enqueue_house_unavailable_notifications();

alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.user_preferences enable row level security;
alter table public.push_campaigns enable row level security;
alter table public.push_campaign_payments enable row level security;
alter table public.notification_push_deliveries enable row level security;

drop policy if exists notifications_owner_read on public.notifications;
create policy notifications_owner_read
on public.notifications
for select
using (
  auth.uid() = user_id
  or public.is_admin_user(auth.uid())
);

drop policy if exists push_subscriptions_owner_read on public.push_subscriptions;
create policy push_subscriptions_owner_read
on public.push_subscriptions
for select
using (
  auth.uid() = user_id
  or public.is_admin_user(auth.uid())
);

drop policy if exists push_subscriptions_owner_insert on public.push_subscriptions;
create policy push_subscriptions_owner_insert
on public.push_subscriptions
for insert
with check (
  auth.uid() = user_id
);

drop policy if exists push_subscriptions_owner_update on public.push_subscriptions;
create policy push_subscriptions_owner_update
on public.push_subscriptions
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

drop policy if exists push_subscriptions_owner_delete on public.push_subscriptions;
create policy push_subscriptions_owner_delete
on public.push_subscriptions
for delete
using (
  auth.uid() = user_id
  or public.is_admin_user(auth.uid())
);

drop policy if exists user_preferences_owner_read on public.user_preferences;
create policy user_preferences_owner_read
on public.user_preferences
for select
using (
  auth.uid() = user_id
  or public.is_admin_user(auth.uid())
);

drop policy if exists user_preferences_owner_insert on public.user_preferences;
create policy user_preferences_owner_insert
on public.user_preferences
for insert
with check (
  auth.uid() = user_id
);

drop policy if exists user_preferences_owner_update on public.user_preferences;
create policy user_preferences_owner_update
on public.user_preferences
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

drop policy if exists push_campaigns_actor_read on public.push_campaigns;
create policy push_campaigns_actor_read
on public.push_campaigns
for select
using (
  auth.uid() = landlord_id
  or public.is_admin_user(auth.uid())
);

drop policy if exists push_campaigns_actor_insert on public.push_campaigns;
create policy push_campaigns_actor_insert
on public.push_campaigns
for insert
with check (
  (
    auth.uid() = landlord_id
    and exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.landlord_id = auth.uid()
    )
  )
  or public.is_admin_user(auth.uid())
);

drop policy if exists push_campaigns_actor_update on public.push_campaigns;
create policy push_campaigns_actor_update
on public.push_campaigns
for update
using (
  auth.uid() = landlord_id
  or public.is_admin_user(auth.uid())
)
with check (
  auth.uid() = landlord_id
  or public.is_admin_user(auth.uid())
);

drop policy if exists push_campaign_payments_actor_read on public.push_campaign_payments;
create policy push_campaign_payments_actor_read
on public.push_campaign_payments
for select
using (
  auth.uid() = user_id
  or public.is_admin_user(auth.uid())
);

drop policy if exists notification_push_deliveries_admin_read on public.notification_push_deliveries;
create policy notification_push_deliveries_admin_read
on public.notification_push_deliveries
for select
using (
  public.is_admin_user(auth.uid())
);

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception
  when undefined_object then
    null;
end
$$;

commit;

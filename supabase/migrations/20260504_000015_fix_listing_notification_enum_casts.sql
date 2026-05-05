begin;

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
    'system'::public.notification_type,
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
    'system'::public.notification_type,
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

commit;

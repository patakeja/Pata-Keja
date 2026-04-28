begin;

alter table public.listings
  add column if not exists image_paths text[] not null default '{}'::text[];

alter table public.listings
  add column if not exists cover_image text;

alter table public.listings
  drop constraint if exists listings_cover_image_in_image_paths;

alter table public.listings
  add constraint listings_cover_image_in_image_paths
  check (cover_image is null or cover_image = any (image_paths));

update public.listings l
set
  image_paths = coalesce(
    (
      select array_agg(li.image_url order by li.sort_order)
      from public.listing_images li
      where li.listing_id = l.id
    ),
    '{}'::text[]
  ),
  cover_image = coalesce(
    (
      select li.image_url
      from public.listing_images li
      where li.listing_id = l.id
      order by li.sort_order asc
      limit 1
    ),
    l.cover_image
  )
where coalesce(array_length(l.image_paths, 1), 0) = 0 or l.cover_image is null;

create index if not exists idx_listings_cover_image on public.listings (cover_image);

commit;

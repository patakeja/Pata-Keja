begin;

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists listing_images_public_read on storage.objects;
create policy listing_images_public_read
on storage.objects
for select
to public
using (bucket_id = 'listing-images');

drop policy if exists listing_images_owner_insert on storage.objects;
create policy listing_images_owner_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
    or exists (
      select 1
      from public.listings
      where listings.id::text = split_part(name, '/', 1)
        and listings.landlord_id = auth.uid()
    )
  )
);

drop policy if exists listing_images_owner_update on storage.objects;
create policy listing_images_owner_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-images'
  and (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
    or exists (
      select 1
      from public.listings
      where listings.id::text = split_part(name, '/', 1)
        and listings.landlord_id = auth.uid()
    )
  )
)
with check (
  bucket_id = 'listing-images'
  and (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
    or exists (
      select 1
      from public.listings
      where listings.id::text = split_part(name, '/', 1)
        and listings.landlord_id = auth.uid()
    )
  )
);

drop policy if exists listing_images_owner_delete on storage.objects;
create policy listing_images_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-images'
  and (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
    or exists (
      select 1
      from public.listings
      where listings.id::text = split_part(name, '/', 1)
        and listings.landlord_id = auth.uid()
    )
  )
);

commit;

begin;

alter table public.counties enable row level security;
alter table public.towns enable row level security;
alter table public.areas enable row level security;

drop policy if exists counties_public_read on public.counties;
create policy counties_public_read
on public.counties
for select
to anon, authenticated
using (true);

drop policy if exists towns_public_read on public.towns;
create policy towns_public_read
on public.towns
for select
to anon, authenticated
using (true);

drop policy if exists areas_public_read on public.areas;
create policy areas_public_read
on public.areas
for select
to anon, authenticated
using (true);

drop policy if exists towns_admin_insert on public.towns;
create policy towns_admin_insert
on public.towns
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
);

drop policy if exists areas_admin_insert on public.areas;
create policy areas_admin_insert
on public.areas
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
);

commit;

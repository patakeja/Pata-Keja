begin;

alter table public.conversations
  add column if not exists booking_id uuid references public.bookings (id) on delete cascade;

alter table public.conversations
  add column if not exists tenant_id uuid references public.users (id) on delete cascade;

alter table public.conversations
  add column if not exists landlord_id uuid references public.users (id) on delete cascade;

delete from public.messages
where conversation_id in (
  select c.id
  from public.conversations c
  where c.booking_id is null
    or c.tenant_id is null
    or c.landlord_id is null
);

delete from public.conversation_participants
where conversation_id in (
  select c.id
  from public.conversations c
  where c.booking_id is null
    or c.tenant_id is null
    or c.landlord_id is null
);

delete from public.conversations
where booking_id is null
  or tenant_id is null
  or landlord_id is null;

insert into public.conversation_participants (conversation_id, user_id)
select c.id, c.tenant_id
from public.conversations c
on conflict (conversation_id, user_id) do nothing;

insert into public.conversation_participants (conversation_id, user_id)
select c.id, c.landlord_id
from public.conversations c
on conflict (conversation_id, user_id) do nothing;

alter table public.conversations
  alter column booking_id set not null;

alter table public.conversations
  alter column tenant_id set not null;

alter table public.conversations
  alter column landlord_id set not null;

alter table public.conversations
  drop constraint if exists conversations_booking_id_unique;

alter table public.conversations
  add constraint conversations_booking_id_unique unique (booking_id);

alter table public.conversations
  drop constraint if exists conversations_tenant_landlord_distinct;

alter table public.conversations
  add constraint conversations_tenant_landlord_distinct
  check (tenant_id <> landlord_id);

create index if not exists idx_conversations_booking_id on public.conversations (booking_id);
create index if not exists idx_conversations_tenant_id on public.conversations (tenant_id);
create index if not exists idx_conversations_landlord_id on public.conversations (landlord_id);

create or replace function public.touch_conversation_updated_at()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set updated_at = timezone('utc', now())
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_messages_touch_conversation_updated_at on public.messages;

create trigger trg_messages_touch_conversation_updated_at
after insert or update on public.messages
for each row
execute function public.touch_conversation_updated_at();

commit;

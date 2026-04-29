begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'message_status') then
    create type public.message_status as enum ('sending', 'sent', 'delivered', 'read');
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name = 'message_text'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name = 'content'
  ) then
    alter table public.messages rename column message_text to content;
  end if;
end
$$;

alter table public.messages
  add column if not exists receiver_id uuid references public.users (id) on delete restrict;

alter table public.messages
  add column if not exists status public.message_status not null default 'sent';

alter table public.messages
  add column if not exists client_message_id text;

alter table public.messages
  add column if not exists original_content text;

alter table public.messages
  add column if not exists is_deleted_by_sender boolean not null default false;

alter table public.messages
  add column if not exists is_deleted_by_receiver boolean not null default false;

alter table public.messages
  add column if not exists deleted_by_user_id uuid references public.users (id) on delete set null;

alter table public.messages
  add column if not exists deleted_at timestamptz;

alter table public.messages
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.messages
set original_content = coalesce(original_content, content)
where original_content is null;

update public.messages m
set receiver_id = case
  when c.tenant_id = m.sender_id then c.landlord_id
  else c.tenant_id
end
from public.conversations c
where c.id = m.conversation_id
  and m.receiver_id is null;

alter table public.messages
  alter column receiver_id set not null;

alter table public.messages
  alter column original_content set not null;

alter table public.messages
  drop constraint if exists messages_message_text_not_blank;

alter table public.messages
  drop constraint if exists messages_content_not_blank;

alter table public.messages
  add constraint messages_content_not_blank
  check (char_length(btrim(content)) > 0);

alter table public.messages
  drop constraint if exists messages_original_content_not_blank;

alter table public.messages
  add constraint messages_original_content_not_blank
  check (char_length(btrim(original_content)) > 0);

alter table public.messages
  drop constraint if exists messages_deleted_at_after_creation;

alter table public.messages
  add constraint messages_deleted_at_after_creation
  check (deleted_at is null or deleted_at >= created_at);

alter table public.messages
  drop constraint if exists messages_receiver_is_participant_fk;

alter table public.messages
  add constraint messages_receiver_is_participant_fk
  foreign key (conversation_id, receiver_id)
  references public.conversation_participants (conversation_id, user_id)
  on delete restrict;

create table if not exists public.message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  read_by_user_id uuid not null references public.users (id) on delete cascade,
  read_at timestamptz not null default timezone('utc', now()),
  constraint message_reads_unique unique (message_id, read_by_user_id)
);

create table if not exists public.user_presence (
  user_id uuid primary key references public.users (id) on delete cascade,
  is_online boolean not null default false,
  last_seen timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_messages_receiver_status on public.messages (receiver_id, status);
create index if not exists idx_messages_client_message_id on public.messages (conversation_id, client_message_id);
create index if not exists idx_message_reads_read_by_user_id on public.message_reads (read_by_user_id, read_at desc);
create index if not exists idx_user_presence_online on public.user_presence (is_online, last_seen desc);

create unique index if not exists idx_messages_conversation_client_message_id
  on public.messages (conversation_id, client_message_id)
  where client_message_id is not null;

drop trigger if exists trg_messages_set_updated_at on public.messages;

create trigger trg_messages_set_updated_at
before update on public.messages
for each row
execute function public.set_updated_at();

drop trigger if exists trg_user_presence_set_updated_at on public.user_presence;

create trigger trg_user_presence_set_updated_at
before update on public.user_presence
for each row
execute function public.set_updated_at();

create or replace function public.enforce_message_rules()
returns trigger
language plpgsql
as $$
declare
  v_tenant_id uuid;
  v_landlord_id uuid;
  v_booking_status public.booking_status;
begin
  select c.tenant_id, c.landlord_id, b.status
  into v_tenant_id, v_landlord_id, v_booking_status
  from public.conversations c
  join public.bookings b on b.id = c.booking_id
  where c.id = new.conversation_id;

  if not found then
    raise exception 'The requested conversation does not exist.';
  end if;

  if v_booking_status not in ('active', 'completed') then
    raise exception 'Chat is only available for active or completed bookings.';
  end if;

  if new.sender_id not in (v_tenant_id, v_landlord_id) then
    raise exception 'The sender is not part of this conversation.';
  end if;

  if new.receiver_id not in (v_tenant_id, v_landlord_id) then
    raise exception 'The receiver is not part of this conversation.';
  end if;

  if new.sender_id = new.receiver_id then
    raise exception 'Sender and receiver cannot be the same user.';
  end if;

  if tg_op = 'insert' and new.original_content is null then
    new.original_content = new.content;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_messages_enforce_rules on public.messages;

create trigger trg_messages_enforce_rules
before insert or update of conversation_id, sender_id, receiver_id, content, status on public.messages
for each row
execute function public.enforce_message_rules();

commit;

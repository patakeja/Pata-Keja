begin;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.user_presence enable row level security;

drop policy if exists conversations_participant_read on public.conversations;
create policy conversations_participant_read
on public.conversations
for select
to authenticated
using (
  tenant_id = auth.uid()
  or landlord_id = auth.uid()
  or exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
);

drop policy if exists conversations_participant_insert on public.conversations;
create policy conversations_participant_insert
on public.conversations
for insert
to authenticated
with check (
  (
    tenant_id = auth.uid()
    or landlord_id = auth.uid()
    or exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  )
  and exists (
    select 1
    from public.bookings
    join public.listings on listings.id = bookings.listing_id
    where bookings.id = conversations.booking_id
      and bookings.listing_id = conversations.listing_id
      and bookings.user_id = conversations.tenant_id
      and listings.landlord_id = conversations.landlord_id
      and bookings.status in ('active', 'completed')
  )
);

drop policy if exists conversations_participant_update on public.conversations;
create policy conversations_participant_update
on public.conversations
for update
to authenticated
using (
  tenant_id = auth.uid()
  or landlord_id = auth.uid()
  or exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
)
with check (
  tenant_id = auth.uid()
  or landlord_id = auth.uid()
  or exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
);

drop policy if exists conversation_participants_access on public.conversation_participants;
create policy conversation_participants_access
on public.conversation_participants
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.conversations
    where conversations.id = conversation_participants.conversation_id
      and (
        conversations.tenant_id = auth.uid()
        or conversations.landlord_id = auth.uid()
        or exists (
          select 1
          from public.users
          where users.id = auth.uid()
            and users.role = 'admin'
        )
      )
  )
);

drop policy if exists conversation_participants_insert on public.conversation_participants;
create policy conversation_participants_insert
on public.conversation_participants
for insert
to authenticated
with check (
  exists (
    select 1
    from public.conversations
    where conversations.id = conversation_participants.conversation_id
      and conversation_participants.user_id in (conversations.tenant_id, conversations.landlord_id)
      and (
        conversations.tenant_id = auth.uid()
        or conversations.landlord_id = auth.uid()
        or exists (
          select 1
          from public.users
          where users.id = auth.uid()
            and users.role = 'admin'
        )
      )
  )
);

drop policy if exists conversation_participants_update on public.conversation_participants;
create policy conversation_participants_update
on public.conversation_participants
for update
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
);

drop policy if exists messages_participant_read on public.messages;
create policy messages_participant_read
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and (
        conversations.tenant_id = auth.uid()
        or conversations.landlord_id = auth.uid()
        or exists (
          select 1
          from public.users
          where users.id = auth.uid()
            and users.role = 'admin'
        )
      )
  )
);

drop policy if exists messages_participant_insert on public.messages;
create policy messages_participant_insert
on public.messages
for insert
to authenticated
with check (
  messages.sender_id = auth.uid()
  and exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and messages.sender_id in (conversations.tenant_id, conversations.landlord_id)
      and messages.receiver_id in (conversations.tenant_id, conversations.landlord_id)
      and messages.sender_id <> messages.receiver_id
  )
);

drop policy if exists messages_participant_update on public.messages;
create policy messages_participant_update
on public.messages
for update
to authenticated
using (
  messages.sender_id = auth.uid()
  or messages.receiver_id = auth.uid()
  or exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
)
with check (
  messages.sender_id = auth.uid()
  or messages.receiver_id = auth.uid()
  or exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
);

drop policy if exists message_reads_participant_read on public.message_reads;
create policy message_reads_participant_read
on public.message_reads
for select
to authenticated
using (
  exists (
    select 1
    from public.messages
    join public.conversations on conversations.id = messages.conversation_id
    where messages.id = message_reads.message_id
      and (
        conversations.tenant_id = auth.uid()
        or conversations.landlord_id = auth.uid()
        or exists (
          select 1
          from public.users
          where users.id = auth.uid()
            and users.role = 'admin'
        )
      )
  )
);

drop policy if exists message_reads_participant_insert on public.message_reads;
create policy message_reads_participant_insert
on public.message_reads
for insert
to authenticated
with check (
  (
    message_reads.read_by_user_id = auth.uid()
    or exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  )
  and exists (
    select 1
    from public.messages
    join public.conversations on conversations.id = messages.conversation_id
    where messages.id = message_reads.message_id
      and (
        conversations.tenant_id = auth.uid()
        or conversations.landlord_id = auth.uid()
        or exists (
          select 1
          from public.users
          where users.id = auth.uid()
            and users.role = 'admin'
        )
      )
  )
);

drop policy if exists message_reads_participant_update on public.message_reads;
create policy message_reads_participant_update
on public.message_reads
for update
to authenticated
using (
  message_reads.read_by_user_id = auth.uid()
  or exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
)
with check (
  message_reads.read_by_user_id = auth.uid()
  or exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
);

drop policy if exists user_presence_authenticated_read on public.user_presence;
create policy user_presence_authenticated_read
on public.user_presence
for select
to authenticated
using (true);

drop policy if exists user_presence_self_insert on public.user_presence;
create policy user_presence_self_insert
on public.user_presence
for insert
to authenticated
with check (
  user_presence.user_id = auth.uid()
  or exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
);

drop policy if exists user_presence_self_update on public.user_presence;
create policy user_presence_self_update
on public.user_presence
for update
to authenticated
using (
  user_presence.user_id = auth.uid()
  or exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
)
with check (
  user_presence.user_id = auth.uid()
  or exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
);

commit;

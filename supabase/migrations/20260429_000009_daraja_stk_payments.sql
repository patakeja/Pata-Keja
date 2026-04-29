begin;

do $$
begin
  if exists (select 1 from pg_type where typname = 'payment_status') then
    alter type public.payment_status add value if not exists 'completed';
    alter type public.payment_status add value if not exists 'failed';
  end if;
end
$$;

alter table public.bookings
  add column if not exists deposit_paid boolean not null default false;

alter table public.payments
  add column if not exists mpesa_receipt text;

alter table public.payments
  add column if not exists phone text;

alter table public.payments
  add column if not exists checkout_request_id text;

alter table public.payments
  add column if not exists merchant_request_id text;

alter table public.payments
  add column if not exists provider_result_code integer;

alter table public.payments
  add column if not exists provider_result_desc text;

alter table public.payments
  add column if not exists provider_response jsonb not null default '{}'::jsonb;

alter table public.payments
  drop constraint if exists payments_phone_not_blank;

alter table public.payments
  add constraint payments_phone_not_blank
  check (phone is null or char_length(btrim(phone)) > 0);

alter table public.payments
  drop constraint if exists payments_mpesa_receipt_not_blank;

alter table public.payments
  add constraint payments_mpesa_receipt_not_blank
  check (mpesa_receipt is null or char_length(btrim(mpesa_receipt)) > 0);

alter table public.payments
  drop constraint if exists payments_checkout_request_id_not_blank;

alter table public.payments
  add constraint payments_checkout_request_id_not_blank
  check (checkout_request_id is null or char_length(btrim(checkout_request_id)) > 0);

alter table public.payments
  drop constraint if exists payments_merchant_request_id_not_blank;

alter table public.payments
  add constraint payments_merchant_request_id_not_blank
  check (merchant_request_id is null or char_length(btrim(merchant_request_id)) > 0);

create index if not exists idx_payments_checkout_request_id on public.payments (checkout_request_id);
create index if not exists idx_payments_merchant_request_id on public.payments (merchant_request_id);
create index if not exists idx_payments_type_status on public.payments (payment_type, status);

create unique index if not exists idx_payments_mpesa_receipt_unique
  on public.payments (mpesa_receipt)
  where mpesa_receipt is not null;

commit;

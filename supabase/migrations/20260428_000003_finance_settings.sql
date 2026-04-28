begin;

do $$
begin
  if exists (select 1 from pg_type where typname = 'payment_status') then
    alter type public.payment_status add value if not exists 'partially_refunded';
  end if;
end
$$;

alter table public.payments
  add column if not exists refund_amount numeric(12, 2) not null default 0;

alter table public.payments
  drop constraint if exists payments_refund_amount_non_negative;

alter table public.payments
  add constraint payments_refund_amount_non_negative
  check (refund_amount >= 0);

alter table public.payments
  drop constraint if exists payments_refund_amount_lte_amount;

alter table public.payments
  add constraint payments_refund_amount_lte_amount
  check (refund_amount <= amount);

create table if not exists public.finance_settings (
  id integer primary key default 1,
  refund_percentage numeric(5, 4) not null default 0.9,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint finance_settings_singleton check (id = 1),
  constraint finance_settings_refund_percentage_range check (refund_percentage between 0 and 1)
);

insert into public.finance_settings (id, refund_percentage)
values (1, 0.9)
on conflict (id) do nothing;

create index if not exists idx_finance_settings_updated_by on public.finance_settings (updated_by);

drop trigger if exists trg_finance_settings_set_updated_at on public.finance_settings;

create trigger trg_finance_settings_set_updated_at
before update on public.finance_settings
for each row
execute function public.set_updated_at();

commit;

-- Contas e as revisões da sua regra (vigência). Os Vencimentos são derivados, não guardados.
-- RLS por user_id em tudo (ADR 0003).

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  registered_on date not null,
  created_at timestamptz not null default now()
);

create table public.bill_revisions (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  effective_from date not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  amount numeric(12, 2) check (amount is null or amount >= 0),
  recurrence text not null check (recurrence in ('monthly', 'yearly', 'once')),
  day smallint not null check (day between 1 and 31),
  month smallint check (month between 1 and 12),
  start_date date not null,
  end_date date,
  tags text[] not null check (
    cardinality(tags) between 1 and 3
    and tags <@ array['housing','utilities','transportation','health','education',
                      'subscriptions','credit_card','taxes','insurance','leisure','other']
  ),
  created_at timestamptz not null default now(),
  check (recurrence = 'monthly' or month is not null),
  check (end_date is null or end_date >= start_date)
);

create index bills_user_id_idx on public.bills (user_id);
create index bill_revisions_bill_id_idx on public.bill_revisions (bill_id, effective_from desc);

alter table public.bills enable row level security;
alter table public.bill_revisions enable row level security;

create policy "bills_select_own" on public.bills
  for select to authenticated using (user_id = auth.uid());
create policy "bills_insert_own" on public.bills
  for insert to authenticated with check (user_id = auth.uid());

create policy "bill_revisions_select_own" on public.bill_revisions
  for select to authenticated using (user_id = auth.uid());
create policy "bill_revisions_insert_own" on public.bill_revisions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.bills b where b.id = bill_id and b.user_id = auth.uid())
  );

-- Cria a Conta e a primeira revisão numa única transação (security invoker: respeita RLS).
create function public.create_bill(
  p_registered_on date,
  p_title text,
  p_amount numeric,
  p_recurrence text,
  p_day smallint,
  p_month smallint,
  p_start_date date,
  p_end_date date,
  p_tags text[]
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_bill_id uuid;
begin
  insert into public.bills (user_id, registered_on)
  values (auth.uid(), p_registered_on)
  returning id into v_bill_id;

  insert into public.bill_revisions
    (bill_id, user_id, effective_from, title, amount, recurrence, day, month, start_date, end_date, tags)
  values
    (v_bill_id, auth.uid(), p_start_date, p_title, p_amount, p_recurrence, p_day, p_month, p_start_date, p_end_date, p_tags);

  return v_bill_id;
end;
$$;

revoke all on function public.create_bill from public, anon;
grant execute on function public.create_bill to authenticated;

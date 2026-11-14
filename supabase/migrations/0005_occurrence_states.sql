-- Estado dos Vencimentos: Pago ou não, e o valor realmente pago (vira o Valor do Vencimento).
-- Sobrepõe o que a regra da Conta diz (ex.: Vencimentos anteriores ao cadastro nascem Pagos).
-- Atrasado é calculado e não é guardado. RLS por user_id (ADR 0003).

create table public.occurrence_states (
  user_id uuid not null references auth.users (id) on delete cascade,
  bill_id uuid not null references public.bills (id) on delete cascade,
  reference_month text not null check (reference_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  is_paid boolean not null,
  amount numeric(12, 2) check (amount is null or amount >= 0),
  updated_at timestamptz not null default now(),
  primary key (bill_id, reference_month)
);

create index occurrence_states_user_id_idx on public.occurrence_states (user_id);

alter table public.occurrence_states enable row level security;

create policy "occurrence_states_select_own" on public.occurrence_states
  for select to authenticated using (user_id = auth.uid());
create policy "occurrence_states_insert_own" on public.occurrence_states
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.bills b where b.id = bill_id and b.user_id = auth.uid())
  );
create policy "occurrence_states_update_own" on public.occurrence_states
  for update to authenticated using (user_id = auth.uid()) with check (
    user_id = auth.uid()
    and exists (select 1 from public.bills b where b.id = bill_id and b.user_id = auth.uid())
  );

-- O Lembrete guarda se o Vencimento está Pago, para as novas tentativas (título com ✅, sem notificação).
alter table public.reminders
  add column paid boolean not null default false;

-- Lembretes: um evento do Google Calendar por Vencimento (ADR 0002).
-- O app é a fonte da verdade; `sync_status` guarda o que ainda falta mandar ao Google (ADR 0005).
-- RLS por user_id (ADR 0003).

alter table public.user_settings
  add column access_revoked boolean not null default false;

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bill_id uuid not null references public.bills (id) on delete cascade,
  reference_month text not null check (reference_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  effective_date date not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  amount numeric(12, 2) check (amount is null or amount >= 0),
  tags text[] not null,
  sync_status text not null default 'pending_create'
    check (sync_status in ('synced', 'pending_create', 'pending_update', 'pending_delete')),
  google_event_id text,
  last_error text,
  created_at timestamptz not null default now(),
  unique (bill_id, reference_month)
);

create index reminders_user_id_idx on public.reminders (user_id);
create index reminders_user_status_idx on public.reminders (user_id, sync_status) where sync_status <> 'synced';

alter table public.reminders enable row level security;

create policy "reminders_select_own" on public.reminders
  for select to authenticated using (user_id = auth.uid());
create policy "reminders_insert_own" on public.reminders
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.bills b where b.id = bill_id and b.user_id = auth.uid())
  );
create policy "reminders_update_own" on public.reminders
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reminders_delete_own" on public.reminders
  for delete to authenticated using (user_id = auth.uid());

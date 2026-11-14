-- Fundação: configurações do Usuário e conexão Google.
-- Todas as tabelas têm RLS por user_id (ADR 0003: escopo restrito).

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  bills_calendar_id text,
  created_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_select_own" on public.user_settings
  for select to authenticated using (user_id = auth.uid());
create policy "user_settings_insert_own" on public.user_settings
  for insert to authenticated with check (user_id = auth.uid());
create policy "user_settings_update_own" on public.user_settings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Refresh token do Google, criptografado no servidor (AES-256-GCM).
-- RLS ligado e SEM policies para anon/authenticated, e sem grants: só o
-- service role (servidor) lê ou escreve. O token nunca chega ao cliente.
create table public.google_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token_encrypted text not null,
  updated_at timestamptz not null default now()
);

alter table public.google_connections enable row level security;
revoke all on public.google_connections from anon, authenticated;

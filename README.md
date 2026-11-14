# Contas do mês

Next.js (App Router) + TypeScript, Supabase, Tailwind e Ant Design. Ver `CLAUDE.md` e `docs/`.

## Rodar

1. `pnpm install`
2. Copie `.env.example` para `.env.local` e preencha.
3. Aplique `supabase/migrations/` no projeto Supabase.
4. No Supabase, habilite o provedor Google (Client ID/Secret do Google Cloud) e adicione `<site>/auth/callback` aos redirects. No Google Cloud, habilite a Calendar API e o escopo `calendar.app.created`.
5. `pnpm dev`

## Estrutura

- `src/core`: núcleo em TypeScript puro (portas `Repository`, `CalendarGateway`, `CommandInterpreter`, `Clock`, casos de uso e fakes em memória). Não depende de Next.js, React nem Supabase.
- `src/infra`: adapters (Supabase, Google Calendar, criptografia do refresh token).
- `src/app`, `src/components`: interface.

## Comandos

`pnpm test` · `pnpm typecheck` · `pnpm build`

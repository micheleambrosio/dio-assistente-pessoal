# Contas do mês

Next.js (App Router) + TypeScript, Supabase, Tailwind e Ant Design. Ver `CLAUDE.md` e `docs/`.

## Rodar

1. `pnpm install`
2. Copie `.env.example` para `.env.local` e preencha (inclusive `NEXT_PUBLIC_SITE_URL`).
3. Aplique `supabase/migrations/` no projeto Supabase.
4. No Supabase, habilite o provedor Google (Client ID/Secret do Google Cloud) e adicione `<site>/auth/callback` aos redirects. No Google Cloud, habilite a Calendar API e o escopo `calendar.app.created`.
5. `pnpm dev`

## Estrutura

- `src/core`: núcleo em TypeScript puro (portas `Repository`, `CalendarGateway`, `CommandInterpreter`, `Clock`, casos de uso e fakes em memória). Não depende de Next.js, React nem Supabase.
- `src/infra`: adapters (Supabase, Google Calendar, criptografia do refresh token).
- `src/app`, `src/components`: interface.

## Comandos

`pnpm test` · `pnpm typecheck` · `pnpm build` · `pnpm test:e2e` · `pnpm eval:interpreter`

## Qualidade

- **Ponta a ponta (`pnpm test:e2e`)**: Playwright em `e2e/`, em light e dark, mobile e desktop. O servidor sobe com `E2E_FAKES=1` (ver `src/infra/runtime.ts`): portas falsas, `Clock` fixo em 12/06/2025 e os dados do protótipo (`src/core/fakes/prototype-seed.ts`), sem Supabase, Google nem Gemini. Roda no CI. Na primeira vez: `pnpm exec playwright install chromium`.
- **Avaliação do Interpretador (`pnpm eval:interpreter`)**: frases fixas em pt-BR com a saída esperada (`evals/interpreter/cases.ts`), contra o Gemini de verdade. **Sob demanda, fora do CI**: usa `GEMINI_API_KEY` (de `.env.local`) e gasta chamadas reais. Reporta a taxa de acerto por intenção e por campo; `--intent=<x>` roda uma intenção, `--verbose` mostra esperado × recebido e `--min=0.9` falha abaixo da taxa.

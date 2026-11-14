# PROTÓTIPO DESCARTÁVEL — tela principal do "Contas do mês"

Responde à pergunta em aberto de layout (`docs/perguntas-em-aberto.md`). Não é código de produção.

```bash
pnpm install && pnpm dev   # http://localhost:3100/?variant=A|B|C
```

- Variantes: `A` Painel · `B` Agenda · `C` Resumo primeiro. ← → do teclado também alternam.
- "Hoje" simulado: **12/06/2025** (`lib/data.ts`), para que a Energia de maio (31/05, sáb.) tenha Data efetiva 02/06.
- Estado só em memória; Comando/Prévia simulados (voz devolve frases de exemplo). Atalhos "mês vazio" e "hoje" na barra.

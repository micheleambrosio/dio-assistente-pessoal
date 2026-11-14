# Perguntas em aberto

Decisões adiadas de propósito. Cada item diz o que falta decidir e como vamos decidir.

## Catálogo de animações

O protótipo da tela principal ([especificação](design/tela-principal.md)) definiu um ponto de partida: check com traço e partículas, entrada e saída de itens por spring, transição de mês, contagem dos números, preenchimento do progresso, anéis e ondas do microfone, e pontos piscando nos Atrasados. Falta fechar o catálogo final (durações, curvas, `prefers-reduced-motion` e o que entra no MVP).

## Resolvidas

- **Layout da tela principal:** resolvido com um protótipo, pela variação B "Agenda". Ver [design/tela-principal.md](design/tela-principal.md).
- **Sair revoga o Google Calendar?** Não. Sair só encerra a sessão; `google_connections` e as Contas ficam, para o Usuário voltar sem reautorizar (o login seguinte renova o `refresh_token`).
- **O tema segue o Usuário entre aparelhos?** Não no MVP: a preferência (Claro, Escuro ou Sistema) fica no `localStorage` do navegador.

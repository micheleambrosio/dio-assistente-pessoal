# Perguntas em aberto

Decisões adiadas de propósito. Cada item diz o que falta decidir e como vamos decidir.

## Layout da tela principal

Ainda não definido. Será resolvido com um **protótipo**, usando o rascunho da tela principal e os prints de referência da usuária, aplicando o `Design.md` no estilo da Wise.

Já sabemos:

- Calendário grande, em destaque, abrindo no mês corrente; os dias com conta ficam destacados.
- Por padrão, a tela mostra as contas do dia, cada uma com um "check", o título e as etiquetas.
- Muitas animações e ícones.
- Responsivo, com light mode e dark mode.

Falta decidir: disposição dos elementos (calendário × lista × entrada de texto/voz), comportamento no mobile, onde fica a entrada de cadastro, como o destaque dos dias aparece, e o catálogo de animações.

### Decisão (protótipo em `prototipo-tela-principal/`): variação B, "Agenda"

Escolhida entre três variações (A Painel, B Agenda, C Resumo primeiro). Ajustes pedidos sobre a B:

- **Comando sempre visível:** a entrada de texto/voz fica fixa e aberta no rodapé, sem botão para escondê-la.
- **Lista do dia na linha do tempo da C:** os Vencimentos do dia usam o componente da C, em que o destaque dos Pagos é mais forte.
- **Verdes:** testamos uma versão menos saturada e voltamos aos verdes originais do Design.md da Wise (lime `#9fe870`, forest `#163300`).

Layout: Resumo do mês em faixa de 4 números no topo, Calendário em largura total com títulos nas células (desktop) ou pontos (mobile), lista do dia abaixo do Calendário, Atrasadas no topo da lista.

**Ainda em aberto:** o catálogo final de animações. O motivo da escolha foi inferido do pedido e precisa da sua confirmação.

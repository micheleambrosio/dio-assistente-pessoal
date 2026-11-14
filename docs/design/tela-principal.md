# Tela principal: especificação de UI

Resultado do protótipo descartável da variação **B, "Agenda"** (branch `prototype/tela-principal`, commit `146b939`, pasta `prototipo-tela-principal/`, rodar com `pnpm install && pnpm dev` e abrir `http://localhost:3100/?variant=B`). O protótipo é **referência visual e comportamental**, não código de produção. As variações A "Painel" e C "Resumo primeiro" foram descartadas.

Termos conforme o [GLOSSARY.md](../../GLOSSARY.md). Referências visuais nesta pasta: [DESIGN.md](DESIGN.md) (Wise), `Draw.png`, `Reference-01.png` e `Reference-02.png`.

## Layout (de cima para baixo)

1. **Cabeçalho do mês:** o nome do mês em display (Inter 900, caixa alta) e a navegação (setas e "Hoje").
2. **Resumo do mês:** uma faixa com 4 números: Pago, A pagar (com o valor em atraso), Total e Progresso ("5 de 12 pagas"). Embaixo, "+N contas sem valor". Tocar abre uma gaveta com os Vencimentos do mês, separados em A pagar e Pagos.
3. **Calendário em largura total:** no desktop, as células mostram chips com o título (até 2, depois "+N contas"). No mobile, só pontos.
4. **Abaixo do Calendário:** duas colunas no desktop, empilhadas no mobile.
   - **Atrasadas:** na mesma estrutura do dia (linha do tempo vertical com pontos). Aparece enquanto houver algum Atrasado. É **global** e não depende do mês aberto.
   - **Dia selecionado:** por padrão hoje, em linha do tempo.
5. **Entrada de Comando** (texto e voz): fica sempre visível, fixa no rodapé, sem opção de esconder. A Prévia aparece acima dela.

## Vencimento na lista

- Check, título, Etiquetas e valor.
- Sem valor: um selo tracejado "sem valor".
- Mês de referência diferente do dia exibido: a marca "ref. <mês>".
- Periodicidade avulsa ou anual: um selo.
- **Pago:** todo Pago vira um cartão escuro (forest `#163300`) com texto branco e check lime, também na gaveta do Resumo. O protótipo destacava só o primeiro Pago do dia e deixava os demais em cinza, mas isso foi trocado por decisão de produto.
- **Atrasado:** o cartão inteiro fica em vermelho escuro (`#8f2228` no light, `#6e1f24` no dark), com texto branco, selo "Atrasada" branco com texto vermelho, Etiquetas em rosa translúcido e check só com borda rosa (`#ffb3b6`).
- Título "Atrasadas" na mesma cor de "Hoje", com o ícone de alerta vermelho piscando.

## Calendário

- O dia com Atrasado fica com fundo vermelho claro, e o chip do Atrasado fica vermelho sólido.
- No light mode, o chip de um Pago num dia vermelho fica branco com texto cinza escuro.

## Comando e Prévia

- **Voz:** botão de microfone com animação de gravação (anéis pulsantes e ondas), contagem regressiva, limite de 30 s e opção de cancelar.
- **Prévia:** "Você disse: …" (voz) ou "Você escreveu: …" (texto), seguido dos campos extraídos (Ação, Título, Valor, Periodicidade, Data de vencimento e Etiquetas), e dos botões **Confirmar** e **Corrigir**. Corrigir aceita linguagem natural ("não, é dia 16"). Nada muda até a confirmação.

## Visual

- **Paleta:** os verdes originais do DESIGN.md: lime `#9fe870`, forest `#163300` e linen `#e2f6d5`. Uma versão menos saturada foi testada e descartada.
- **Light e dark mode:** os mesmos tokens, invertidos.
- **Tipografia:** Inter, com **Inter 900 no lugar da Wise Sans** (fonte proprietária).
- **Desvio deliberado do DESIGN.md:** o DESIGN.md diz para não usar o Alarm Red como cor de status, mas aqui o vermelho **é** o status Atrasado. A escolha é intencional, porque o Atrasado precisa saltar aos olhos.

## Animações (ponto de partida; o catálogo final ainda está em aberto)

Check com traço e partículas, entrada e saída de itens por spring, transição de mês, contagem dos números do Resumo, preenchimento do progresso, anéis e ondas do microfone, e pontos piscando nos Atrasados.

## Critérios de aceite (casos cobertos pelo mock)

- [ ] Um dia com 4 ou mais Vencimentos (10/06: Água, Cartão, Academia e Netflix) mostra 2 chips e "+N contas" no desktop, e a lista completa no dia.
- [ ] Um Vencimento sem valor mostra o selo "sem valor" e entra em "+N contas sem valor", e não nos totais.
- [ ] A "Energia de maio" com Data efetiva em 2/jun aparece em 2/jun com "ref. maio" e entra no Resumo de **maio**.
- [ ] Atrasados, Pagos e a pagar convivem no mesmo mês, cada um com o seu estilo.
- [ ] Contas avulsa e anual mostram o selo de Periodicidade.
- [ ] Um mês vazio mostra "Mês vazio" no Resumo e "Nenhuma Conta vence neste dia" na lista.
- [ ] O bloco Atrasadas aparece em qualquer mês aberto enquanto houver algum Atrasado.

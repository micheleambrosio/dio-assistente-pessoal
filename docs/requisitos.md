# Requisitos e decisões

O que foi decidido durante a entrevista de descoberta. Os termos seguem o [GLOSSARY.md](../GLOSSARY.md). As decisões estruturais estão em [docs/adr/](adr/). O que ainda está em aberto fica em [perguntas-em-aberto.md](perguntas-em-aberto.md).

## Stack

Next.js, TypeScript, Supabase, Tailwind, Ant Design, Google Gemini (extração e categorização) e Google Calendar API. Login com conta Google.

## Localização

- Só pt-BR (interface e Comandos), só valores em R$, e fuso America/Sao_Paulo fixo para todos os Usuários.

## Público e lançamento

- A arquitetura é multiusuário desde o início: cada Usuário só acessa os próprios dados (RLS no Supabase).
- O MVP é restrito à dona do projeto e a convidados, com o app Google em modo "Testing" (até 100 usuários de teste).
- Verificação do app pelo Google, política de privacidade, termos de uso e abertura ao público ficam para depois do MVP.

## Cadastro

- Sem CRUD: o Usuário escreve ou fala (com transcrição) e o Gemini extrai título, valor (opcional), Periodicidade, Data de vencimento, data final (opcional) e etiquetas.
- A IA mostra uma **Prévia**. O Usuário confirma ou corrige em linguagem natural ("não, é dia 16"). Só depois disso a Conta é salva e os Lembretes são criados.
- Periodicidades: **mensal**, **anual** e **avulsa**. A IA distingue "todo dia 20" (mensal), "todo 15 de agosto" (anual) e "20 de março" (avulsa).
- Uma Conta mensal ou anual sem data final é uma **Conta fixa**.
- O Gemini escolhe de 1 a 3 Etiquetas numa **lista fixa**: Moradia, Utilidades, Transporte, Saúde, Educação, Assinaturas, Cartão, Impostos, Seguros, Lazer e Outros. O Usuário pode corrigi-las por Comando de edição.
- Data de início: por padrão é o próximo Vencimento a partir de hoje, mas pode ser informada no texto ("desde janeiro", "comecei a pagar em agosto"). Vencimentos anteriores ao cadastro já nascem **pagos** e sem Lembrete.

## Comandos

- Voz: o áudio vai direto para o Gemini, que transcreve e interpreta numa única chamada. A gravação tem limite de 30 segundos, e a Prévia mostra a transcrição ("Você disse: …"). Custo estimado: cerca de 32 tokens por segundo de áudio, o que deixa a chamada uns 10 a 25% maior que a mesma frase em texto.
- Todo Comando passa por uma Prévia antes de ter efeito ([ADR 0004](adr/0004-mutacoes-por-comando-com-previa.md)).
- No MVP, a IA entende: cadastrar Conta, informar valor, editar Conta, encerrar e marcar como Pago.
- **Excluir** só pela interface, porque é destrutivo. **Consultar** ("quanto paguei em outubro?") fica para depois.
- Editar afeta só os Vencimentos a partir de hoje. Se o dia mudar, os Lembretes futuros são recriados.
- Se a frase for ambígua, a Prévia pergunta qual Conta, em vez de chutar.
- Se o Comando de cadastro parecer uma Conta que já existe ("energia" de novo), a Prévia avisa e pergunta se é uma nova Conta ou uma edição.
- Atalhos visuais continuam existindo: o check, e Encerrar/Excluir no detalhe da Conta.

## Datas

- Se o dia não existe no mês, a Data de vencimento passa a ser o último dia do mês.
- A Data efetiva é o próximo Dia útil, mesmo que caia no mês seguinte. O Vencimento continua no seu Mês de referência ([ADR 0001](adr/0001-ajuste-para-frente-e-mes-de-referencia.md)).
- Uma Conta avulsa segue a mesma regra de Data efetiva e gera um único Vencimento e um único Lembrete.
- Data final é inclusiva: "até dezembro" inclui o Vencimento de dezembro, e "10x a partir de abril" termina em janeiro.
- Feriado = feriados nacionais da lei + Carnaval (segunda e terça) + Corpus Christi. Datas móveis são calculadas a partir da Páscoa.

## Pagamento

- **Valor da Conta** é o padrão (opcional). **Valor do Vencimento** substitui o padrão naquele mês e pode ser informado pela entrada em linguagem natural ("a energia de novembro deu 187,40", com Prévia) ou num campo opcional "valor pago" no check. Mudar o valor atualiza o título do Lembrete.
- O check marca o Vencimento como **Pago**.
- **Atrasado** (calculado): não Pago e com a Data efetiva no passado. Aparece num bloco **global** "Atrasadas" (independente do mês aberto) até receber o check, e tem destaque próprio no Calendário.
- Ao marcar como Pago, o Lembrete ganha "✅" no título e perde a notificação. Ao desmarcar, o título volta ao original e a notificação é recriada (se a Data efetiva ainda não passou).
- Fora do MVP: multa e juros, e "pago com atraso" como estado separado.

## Remoção

- **Encerrar**: a Conta ganha data final hoje, o histórico fica e os Vencimentos e Lembretes futuros são removidos.
- **Excluir**: apaga a Conta, todos os Vencimentos e os Lembretes futuros. Serve para cadastros errados.

## Google Calendar

- Um Lembrete por Vencimento, na Data efetiva ([ADR 0002](adr/0002-um-lembrete-por-vencimento-com-janela-de-12-meses.md)).
- Janela de lembretes de 12 Vencimentos. Quando o Usuário abre o app e a Conta está no último mês da janela (ou depois dele), o app cria os próximos 12.
- Os Lembretes ficam na Agenda de contas dedicada "Contas do mês", com o escopo `calendar.app.created` ([ADR 0003](adr/0003-agenda-de-contas-dedicada-com-escopo-restrito.md)).
- O Lembrete é um evento das 9h às 9h15 na Data efetiva, com pop-up às 9h e título "Conta: valor" (sem o valor, se ele não foi informado). A descrição leva as etiquetas e um link para o app. O horário é fixo no MVP.
- O app é a fonte da verdade e a Agenda de contas é um espelho de mão única ([ADR 0005](adr/0005-app-fonte-da-verdade-calendar-espelho.md)). Falhas viram Lembretes pendentes, e o app tenta de novo ao ser aberto, com um aviso ("3 lembretes não chegaram ao Google, tentar agora") e um pedido de reconexão se o acesso foi revogado.

## Tela principal

- Calendário do mês corrente com os dias que têm Vencimentos destacados. Por padrão, a tela mostra os Vencimentos do dia com um check, o título e as etiquetas.
- Dá para navegar para meses anteriores ao cadastro do Usuário e para meses futuros.
- **Resumo do mês**, ligado ao mês aberto no Calendário e calculado pelo Mês de referência: Pago, A pagar (com os Atrasados em destaque), Total e progresso ("8 de 12 pagas"). Vencimentos sem valor entram na contagem e não nos totais ("+2 contas sem valor"). Ao tocar no resumo, aparecem todos os Vencimentos do mês, separados em pagos e a pagar.
- Fora do MVP: gráficos por Etiqueta e comparação entre meses.
- Responsiva, com light mode e dark mode.
- Layout, estilos e critérios de aceite da UI: [design/tela-principal.md](design/tela-principal.md) (variação B "Agenda" do protótipo).

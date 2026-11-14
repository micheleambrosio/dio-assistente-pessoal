# Código e banco em inglês, linguagem de domínio e interface em português

Todo identificador de código (variáveis, funções, classes, tipos, enums, arquivos e pastas) e todo objeto de banco (tabelas, colunas, valores de enum) usa **inglês**. O [GLOSSARY.md](../../GLOSSARY.md), os documentos, as issues e os textos da interface continuam em **pt-BR**. Para que a linguagem ubíqua não se perca na tradução, cada termo do glossário tem **exatamente uma** tradução canônica, definida na tabela abaixo. Não use sinônimos. Termos que não estão na tabela seguem a mesma lógica: escolha uma tradução, acrescente-a aqui e use-a sempre.

| Glossário (pt-BR) | Código (en) |
|---|---|
| Usuário | `User` |
| Conta | `Bill` |
| Conta fixa | `Bill` com `endDate` nulo (`isFixed`) |
| Periodicidade (mensal / anual / avulsa) | `Recurrence` (`monthly` / `yearly` / `once`) |
| Vencimento | `Occurrence` |
| Pago | `paid` (`isPaid`, `paidAt`) |
| Atrasado | `overdue` (`isOverdue`) |
| Data de vencimento | `dueDate` |
| Data efetiva | `effectiveDate` |
| Mês de referência | `referenceMonth` |
| Data de início / data final | `startDate` / `endDate` |
| Dia útil | `businessDay` |
| Feriado | `Holiday` |
| Valor da Conta / Valor do Vencimento | `Bill.amount` / `Occurrence.amount` |
| Vigência da regra da Conta | `BillRevision` (`effectiveFrom`) |
| Encerrar / Excluir | `endBill` / `deleteBill` |
| Comando | `Command` |
| Prévia | `Preview` |
| Etiqueta | `Tag` |
| Lembrete | `Reminder` |
| Janela de lembretes | `ReminderWindow` |
| Lembrete pendente | `Reminder` com `syncStatus` `pending_create` / `pending_update` / `pending_delete` |
| Agenda de contas (Google) | `BillsCalendar` |
| Calendário (visão do app) | `MonthCalendar` |
| Resumo do mês | `MonthSummary` |
| Regra de uma Conta (revisão vigente) | `BillRule` |
| O que a IA extrai de um Comando de cadastro | `Draft` |
| Vencimentos de um mês, por dia | `MonthView` |
| Dia do cadastro da Conta (`registeredOn`) | `registeredOn` |
| Parcelas / mês inicial / mês final de um Comando | `installments` / `startMonth` / `endMonth` |

Valores de Etiqueta: `housing` (Moradia), `utilities` (Utilidades), `transportation` (Transporte), `health` (Saúde), `education` (Educação), `subscriptions` (Assinaturas), `credit_card` (Cartão), `taxes` (Impostos), `insurance` (Seguros), `leisure` (Lazer), `other` (Outros). Os rótulos em pt-BR ficam só na camada de interface.

## Consequences

- O código passa a usar termos que o glossário marca como _Avoid_ em português (por exemplo, `Occurrence` para Vencimento e `Tag` para Etiqueta). Isso é intencional: o _Avoid_ vale para textos em pt-BR, e a tabela acima é a única ponte.
- O protótipo em `prototype/tela-principal` usa identificadores em português e não segue esta ADR. Ele é descartável.

# Um Lembrete por Vencimento, com Janela de lembretes de 12 meses estendida ao abrir o app

A recorrência nativa do Google Calendar não sabe ajustar datas para o próximo Dia útil. Por isso, cada Vencimento vira um evento próprio na sua Data efetiva, em vez de uma série recorrente por Conta. Como uma Conta fixa tem infinitos Vencimentos, o Calendar recebe só uma Janela de lembretes de 12 Vencimentos. Quando o Usuário abre o app e a Conta está no último mês da sua janela (ou já passou dele, se o app ficou sem ser aberto), o app cria os Lembretes dos próximos 12 Vencimentos. Não há rotina em segundo plano. No app, a lista de Vencimentos vem da regra da Conta, sem limite de horizonte.

## Considered Options

- **Evento recorrente com exceções por mês**: foi rejeitado porque cada exceção de dia útil precisaria ser calculada e mantida à mão, e qualquer edição da Conta reescreveria a série.
- **Rotina agendada (cron) para estender a janela**: foi rejeitada por ora porque a extensão ao abrir o app basta e evita uma infraestrutura a mais.

## Consequences

- Se o Usuário passar mais de um mês sem abrir o app depois do fim da janela, alguns Lembretes não serão criados até ele voltar.

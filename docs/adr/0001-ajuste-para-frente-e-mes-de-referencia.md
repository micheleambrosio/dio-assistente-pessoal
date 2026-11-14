# Data efetiva avança para o próximo dia útil, mesmo cruzando o mês, e o Vencimento continua no seu Mês de referência

Quando a Data de vencimento cai em fim de semana ou feriado nacional, a Data efetiva passa para o próximo dia útil, mesmo que ele caia no mês seguinte, como fazem bancos e boletos. Para que "o que paguei em maio" continue correto, o Vencimento pertence ao Mês de referência dado pela Data de vencimento, e não ao mês da Data efetiva. Por isso, o calendário de junho pode mostrar uma conta de maio. Datas inexistentes no mês (31 em fevereiro, 29/02 em ano não bissexto) passam a ser o último dia do mês.

## Considered Options

- **Antecipar para o dia útil anterior** e manter tudo dentro do mês: foi rejeitado porque faria o Usuário pagar antes do necessário e não bate com a regra bancária.
- **Mês de referência igual ao mês da Data efetiva**: foi rejeitado porque a conta de maio sumiria do resumo de maio.

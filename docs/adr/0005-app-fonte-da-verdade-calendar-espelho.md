# O app é a fonte da verdade, e a Agenda de contas é um espelho de mão única

Toda operação (cadastrar, editar, Encerrar, Excluir, Pago, informar valor) é salva no app mesmo quando o Google Calendar falha. Os Lembretes afetados viram Lembretes pendentes, e o app tenta de novo quando é aberto, com um aviso ao Usuário e um pedido para reconectar a conta Google se o acesso tiver sido revogado. Escolhemos isso em vez de "tudo ou nada" para que uma instabilidade do Google nunca impeça o Usuário de registrar as suas contas.

## Consequences

- A sincronização é de mão única (app → Google). Alterações feitas manualmente nos Lembretes dentro do Google Calendar não voltam para o app e podem ser sobrescritas na próxima sincronização.

# Lembretes ficam numa Agenda de contas dedicada, com o escopo `calendar.app.created`

O app cria no Google Calendar do Usuário um calendário próprio, "Contas do mês", e coloca todos os Lembretes nele, em vez de usar o calendário principal. Assim, o login pede só o escopo `calendar.app.created`, que dá acesso apenas aos calendários criados pelo app, e não a agenda inteira. Isso deixa a tela de consentimento menos assustadora e facilita a verificação do app pelo Google. O Usuário também pode ocultar, colorir ou compartilhar a Agenda de contas, ou apagá-la para limpar tudo.

## Consequences

- Mudar para o calendário principal no futuro exige pedir um escopo mais amplo e um novo consentimento de todos os Usuários.
- Se o Usuário apagar a Agenda de contas no Google, o app precisa detectar isso e recriá-la (com os Lembretes da janela atual).

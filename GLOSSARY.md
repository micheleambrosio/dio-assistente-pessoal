# Contas do mês

Organiza as contas que o Usuário tem a pagar: o que vence em cada dia, o que já foi pago no mês e o que ainda vem pela frente.

## Language

**Usuário**:
A pessoa que usa a plataforma, identificada pela sua conta Google.
_Avoid_: Conta (no sentido de cadastro no SaaS), cliente

**Conta**:
Uma cobrança que o Usuário cadastrou, como "Energia, vence dia 10". Tem uma Periodicidade e pode ter valor e data final, mas nenhum dos dois é obrigatório.
_Avoid_: Boleto, despesa, fatura

**Periodicidade**:
A frequência com que uma Conta gera Vencimentos: **mensal** (todo mês num dia), **anual** (todo ano num dia e mês) ou **avulsa** (uma única vez numa data).
_Avoid_: Frequência, recorrência

**Conta fixa**:
Uma Conta mensal ou anual sem data final, que se repete por tempo indeterminado.
_Avoid_: Conta recorrente, assinatura

**Vencimento**:
A ocorrência de uma Conta num período específico (um mês, um ano ou a data única de uma Conta avulsa), com a sua data efetiva e o seu próprio status de pago.
_Avoid_: Parcela, ocorrência, lançamento

**Pago**:
O estado de um Vencimento que o Usuário marcou como quitado.
_Avoid_: Quitado, baixado

**Atrasado**:
O estado de um Vencimento que não está Pago e cuja Data efetiva já passou. É calculado, e não marcado pelo Usuário.
_Avoid_: Vencido, pendente, em aberto

**Encerrar**:
Dar uma data final a uma Conta a partir de hoje. Os Vencimentos passados continuam no histórico e os futuros deixam de existir.
_Avoid_: Remover, cancelar, desativar

**Excluir**:
Apagar uma Conta e todos os seus Vencimentos, inclusive os pagos. Serve para desfazer um cadastro feito por engano.
_Avoid_: Remover, deletar

**Comando**:
O que o Usuário escreve ou fala na entrada de linguagem natural, como "internet Vivo, 120, todo dia 15" ou "paguei a água". Pode cadastrar, editar ou encerrar uma Conta, informar um valor ou marcar um Vencimento como Pago.
_Avoid_: Prompt, mensagem, input

**Prévia**:
O que a IA entendeu de um Comando, mostrado ao Usuário para confirmação ou correção. Nada muda até a Prévia ser confirmada.
_Avoid_: Rascunho, pré-cadastro

**Data de vencimento**:
A data nominal de um Vencimento, como o Usuário a informou ("todo dia 31" em maio = 31/05). Se o dia não existe no mês, vale o último dia do mês.
_Avoid_: Vencimento (sozinho, para se referir à data)

**Dia útil**:
Um dia que não é sábado, domingo nem Feriado.
_Avoid_: Dia comercial

**Feriado**:
Um feriado nacional previsto em lei, mais a segunda e a terça de Carnaval e o Corpus Christi, que são os dias em que os bancos não abrem no país todo. Feriados estaduais e municipais não contam.
_Avoid_: Feriado bancário, ponto facultativo

**Data efetiva**:
A Data de vencimento ajustada para o próximo Dia útil quando cai fora de um. Pode cair no mês seguinte.
_Avoid_: Data ajustada, data real

**Mês de referência**:
O mês a que um Vencimento pertence, dado pela Data de vencimento e não pela Data efetiva. "Energia de maio" é de maio mesmo que a Data efetiva seja 02/06.
_Avoid_: Competência, mês do pagamento

**Lembrete**:
O evento no Google Calendar do Usuário que representa um Vencimento, na sua Data efetiva.
_Avoid_: Evento, notificação, alarme

**Janela de lembretes**:
O período à frente para o qual uma Conta já tem Lembretes criados no Calendar, de até 12 meses de Vencimentos.
_Avoid_: Horizonte, buffer

**Agenda de contas**:
O calendário dedicado "Contas do mês" que o app cria no Google Calendar do Usuário e onde ficam todos os Lembretes. Não confundir com o Calendário do app.
_Avoid_: Calendário (para se referir ao Google)

**Calendário**:
A visão mensal dentro do app que destaca os dias com Vencimentos.
_Avoid_: Agenda

**Data de início**:
A data do primeiro Vencimento de uma Conta. Por padrão é o próximo Vencimento a partir do cadastro (o primeiro cuja Data efetiva é no dia do cadastro ou depois), mas pode ser anterior a ele ("desde janeiro").
_Avoid_: Data de cadastro, data de criação

**Etiqueta**:
Uma categoria de uma Conta, escolhida pela IA numa lista fixa: Moradia, Utilidades, Transporte, Saúde, Educação, Assinaturas, Cartão, Impostos, Seguros, Lazer e Outros.
_Avoid_: Tag, categoria, rótulo

**Lembrete pendente**:
Um Lembrete cuja criação, alteração ou remoção no Google Calendar ainda não deu certo e espera uma nova tentativa.
_Avoid_: Erro de sync, falha

**Resumo do mês**:
O balanço de um Mês de referência: total Pago, total a pagar, total do mês e quantas Contas já foram pagas.
_Avoid_: Dashboard, extrato, relatório

export const TAGS = [
  "housing",
  "utilities",
  "transportation",
  "health",
  "education",
  "subscriptions",
  "credit_card",
  "taxes",
  "insurance",
  "leisure",
  "other",
] as const;
export type Tag = (typeof TAGS)[number];

export const RECURRENCES = ["monthly", "yearly", "once"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

/** Regra de uma Conta (a revisão vigente). Datas são `YYYY-MM-DD`. */
export type BillRule = {
  id: string;
  title: string;
  amount?: number;
  recurrence: Recurrence;
  /** Dia do mês da Data de vencimento (1-31). */
  day: number;
  /** Mês (1-12) da Data de vencimento; só em Contas anuais e avulsas. */
  month?: number;
  /** Primeira Data de vencimento (nominal). */
  startDate: string;
  /** Última Data de vencimento (nominal), inclusiva. Sem ela, é uma Conta fixa. */
  endDate?: string;
  tags: Tag[];
  /** Dia do cadastro: Vencimentos com Data efetiva anterior a ele nascem Pagos. */
  registeredOn: string;
};

/** Identifica um Vencimento: a Conta e o Mês de referência (`YYYY-MM`, dado pela Data de vencimento). */
export type OccurrenceRef = {
  billId: string;
  referenceMonth: string;
};

export const occurrenceKey = (o: OccurrenceRef) => `${o.billId}:${o.referenceMonth}`;

export const isSameOccurrence = (a: OccurrenceRef, b: OccurrenceRef) =>
  a.billId === b.billId && a.referenceMonth === b.referenceMonth;

/** Vencimento. */
export type Occurrence = OccurrenceRef & {
  title: string;
  tags: Tag[];
  recurrence: Recurrence;
  /** Nominal, já ajustada ao último dia do mês. */
  dueDate: string;
  /** Próximo Dia útil; pode cruzar o mês. */
  effectiveDate: string;
  amount?: number;
  isPaid: boolean;
  /** Calculado: `!isPaid && effectiveDate < today`. */
  isOverdue: boolean;
};

export type OccurrenceStatus = "paid" | "overdue" | "open";

export function occurrenceStatus(o: Pick<Occurrence, "isPaid" | "isOverdue">): OccurrenceStatus {
  return o.isPaid ? "paid" : o.isOverdue ? "overdue" : "open";
}

/** numeric(12, 2) no banco: até 10 dígitos inteiros. */
const MAX_AMOUNT = 1e10;

/** Valor aceito para uma Conta ou um Vencimento: número finito, sem negativo, que cabe no banco. */
export function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value < MAX_AMOUNT;
}

/** O que o Usuário decidiu sobre um Vencimento: Pago ou não, e o valor realmente pago. Sobrepõe o que a regra da Conta diz. */
export type OccurrenceState = OccurrenceRef & {
  isPaid: boolean;
  /** Valor pago; passa a ser o Valor do Vencimento. */
  amount?: number;
};

/** O que a IA extrai de um Comando de cadastro. Tudo que a Prévia mostra nasce daqui. */
export type Draft = {
  title: string;
  amount?: number;
  recurrence: Recurrence;
  /** Dia do mês da Data de vencimento (1-31). */
  day: number;
  /** Mês (1-12): obrigatório em Contas anuais e avulsas. */
  month?: number;
  /** Ano da Conta avulsa, quando o Comando o diz. */
  year?: number;
  /** `YYYY-MM` do primeiro Vencimento, quando o Comando o diz ("desde janeiro"). */
  startMonth?: string;
  /** Número de parcelas ("10x"): conta a partir do primeiro Vencimento. */
  installments?: number;
  /** `YYYY-MM` do último Vencimento, inclusivo ("até dezembro"). */
  endMonth?: string;
  /** De 1 a 3 Etiquetas. */
  tags: Tag[];
};

/** Áudio gravado de um Comando falado, enviado inline à IA. */
export type AudioInput = {
  data: Uint8Array;
  /** Ex.: `audio/webm`. */
  mimeType: string;
};

/** O que a IA entendeu de um Comando, para o Usuário confirmar ou corrigir. Não é persistida. */
export type Preview = Draft & {
  action: "create_bill";
  /** "voice" quando o Comando foi falado; ausente no Comando escrito. */
  source?: "voice";
  /** O texto do Comando (ou a transcrição, se falado), mostrado como "Você escreveu/disse: …". */
  originalText: string;
  /** Primeira Data de vencimento, derivada do Draft (só para exibição). */
  startDate: string;
  /** Última Data de vencimento, inclusiva; ausente numa Conta fixa (só para exibição). */
  endDate?: string;
};

export type ReminderSyncStatus = "synced" | "pending_create" | "pending_update" | "pending_delete";

/** Lembrete: o evento do Google Calendar que representa um Vencimento. O conteúdo é guardado para as novas tentativas. */
export type Reminder = OccurrenceRef & {
  id: string;
  /** Dia do evento: a Data efetiva do Vencimento. */
  effectiveDate: string;
  title: string;
  amount?: number;
  tags: Tag[];
  /** O Vencimento está Pago: o título ganha "✅ " e a notificação some. */
  isPaid: boolean;
  syncStatus: ReminderSyncStatus;
  /** Id do evento no Google; ausente até a criação dar certo. */
  googleEventId?: string;
  /** Último erro ao falar com o Google; some quando o Lembrete sincroniza. */
  lastError?: string;
};

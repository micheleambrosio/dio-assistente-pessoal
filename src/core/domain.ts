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
  /** Dia do cadastro: Vencimentos anteriores a ele nascem Pagos. */
  registeredOn: string;
};

/** Vencimento. */
export type Occurrence = {
  billId: string;
  title: string;
  tags: Tag[];
  recurrence: Recurrence;
  /** `YYYY-MM`, dado pela Data de vencimento. */
  referenceMonth: string;
  /** Nominal, já ajustada ao último dia do mês. */
  dueDate: string;
  /** Próximo Dia útil; pode cruzar o mês. */
  effectiveDate: string;
  amount?: number;
  isPaid: boolean;
  /** Calculado: `!isPaid && effectiveDate < today`. */
  isOverdue: boolean;
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

/** O que a IA entendeu de um Comando, para o Usuário confirmar ou corrigir. Não é persistida. */
export type Preview = Draft & {
  action: "create_bill";
  /** O texto do Comando, mostrado como "Você escreveu: …". */
  originalText: string;
  /** Primeira Data de vencimento, derivada do Draft (só para exibição). */
  startDate: string;
  /** Última Data de vencimento, inclusiva; ausente numa Conta fixa (só para exibição). */
  endDate?: string;
};

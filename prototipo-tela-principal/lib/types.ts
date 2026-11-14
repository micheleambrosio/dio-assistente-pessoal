export const ETIQUETAS = ["Moradia","Utilidades","Transporte","Saúde","Educação","Assinaturas","Cartão","Impostos","Seguros","Lazer","Outros"] as const;
export type Etiqueta = (typeof ETIQUETAS)[number];
export type Periodicidade = "mensal" | "anual" | "avulsa";

export type Conta = {
  id: string;
  titulo: string;
  periodicidade: Periodicidade;
  dia: number;
  mes?: number;          // anual (1-12) ou avulsa
  ano?: number;          // avulsa
  valor?: number;        // Valor da Conta (opcional)
  etiquetas: Etiqueta[];
  inicio: string;        // Mês da Data de início "YYYY-MM"
  fim?: string;          // Data final inclusiva "YYYY-MM"
};

export type Vencimento = {
  id: string;
  contaId: string;
  titulo: string;
  periodicidade: Periodicidade;
  etiquetas: Etiqueta[];
  valor?: number;          // Valor do Vencimento (ou da Conta)
  mesReferencia: string;   // "YYYY-MM" — dado pela Data de vencimento
  dataVencimento: string;  // "YYYY-MM-DD"
  dataEfetiva: string;     // "YYYY-MM-DD" — próximo Dia útil
  pago: boolean;
  atrasado: boolean;       // calculado: !pago && dataEfetiva < hoje
};

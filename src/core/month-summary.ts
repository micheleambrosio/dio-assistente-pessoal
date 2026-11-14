import type { Occurrence } from "./domain";

/** Resumo do mês: o balanço de um Mês de referência. Vencimentos sem valor entram na contagem, não nos totais. */
export type MonthSummary = {
  paidTotal: number;
  /** Total a pagar (inclui o que está Atrasado). */
  toPayTotal: number;
  /** Parte do a pagar que já está Atrasada. */
  overdueTotal: number;
  total: number;
  paidCount: number;
  count: number;
  withoutAmountCount: number;
};

/** `occurrences` são os Vencimentos cujo Mês de referência é o mês resumido. */
export function summarize(occurrences: Occurrence[]): MonthSummary {
  const sum = (list: Occurrence[]) => cents(list.reduce((acc, o) => acc + Math.round((o.amount ?? 0) * 100), 0));
  const paid = occurrences.filter((o) => o.isPaid);
  const open = occurrences.filter((o) => !o.isPaid);
  const paidTotal = sum(paid);
  const toPayTotal = sum(open);
  return {
    paidTotal,
    toPayTotal,
    overdueTotal: sum(open.filter((o) => o.isOverdue)),
    total: cents(Math.round(paidTotal * 100) + Math.round(toPayTotal * 100)),
    paidCount: paid.length,
    count: occurrences.length,
    withoutAmountCount: occurrences.filter((o) => o.amount === undefined).length,
  };
}

const cents = (value: number) => value / 100;

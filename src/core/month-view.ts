import { monthOf, shiftMonth } from "@/lib/month";
import type { Occurrence } from "./domain";
import { summarize } from "./month-summary";
import type { MonthSummary } from "./month-summary";
import { occurrencesBetween } from "./occurrences";
import type { Clock, Repository } from "./ports";

export type MonthView = {
  month: string;
  /** Vencimentos cuja Data efetiva cai no mês, por dia. */
  days: Record<string, Occurrence[]>;
  /** Todos os Atrasados, de qualquer mês, por Data efetiva: o bloco "Atrasadas" não depende do mês aberto. */
  overdue: Occurrence[];
  /** Vencimentos cujo Mês de referência é o mês (a "Energia de maio" paga em 2/jun é de maio). */
  referenceOccurrences: Occurrence[];
  summary: MonthSummary;
};

/** O que a tela principal mostra de um mês: os dias, o bloco global de Atrasadas e o Resumo. */
export async function getMonth(
  deps: { repository: Repository; clock: Clock },
  userId: string,
  month: string,
): Promise<MonthView> {
  const today = deps.clock.today();
  const bills = await deps.repository.listBills(userId);
  const states = await deps.repository.listOccurrenceStates(userId);
  const byDate = (a: Occurrence, b: Occurrence) =>
    a.effectiveDate.localeCompare(b.effectiveDate) || a.title.localeCompare(b.title, "pt-BR");

  // Um Vencimento de maio pode ter Data efetiva em junho: olha o mês anterior também.
  const around = bills.flatMap((bill) => occurrencesBetween(bill, shiftMonth(month, -1), month, today, states));
  const inMonth = around.filter((o) => monthOf(o.effectiveDate) === month).sort(byDate);
  const referenceOccurrences = around.filter((o) => o.referenceMonth === month).sort(byDate);

  const days: Record<string, Occurrence[]> = {};
  for (const occurrence of inMonth) (days[occurrence.effectiveDate] ??= []).push(occurrence);

  const overdue = bills
    .flatMap((bill) => occurrencesBetween(bill, monthOf(bill.startDate), monthOf(today), today, states))
    .filter((o) => o.isOverdue)
    .sort(byDate);

  return { month, days, overdue, referenceOccurrences, summary: summarize(referenceOccurrences) };
}

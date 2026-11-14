import { dueDateIn, effectiveDate } from "./business-calendar";
import { isSameOccurrence } from "./domain";
import type { BillRule, Occurrence, OccurrenceState } from "./domain";
import { monthNumberOf, monthOf, shiftMonth } from "@/lib/month";

/**
 * Vencimentos derivados da regra da Conta cujo Mês de referência está em
 * [fromMonth, toMonth] (`YYYY-MM`, inclusivos). Não há limite de horizonte.
 */
export function occurrencesBetween(
  rule: BillRule,
  fromMonth: string,
  toMonth: string,
  today: string,
  states: OccurrenceState[] = [],
): Occurrence[] {
  const result: Occurrence[] = [];
  for (let month = fromMonth; month <= toMonth; month = shiftMonth(month, 1)) {
    if (!hasDueDateIn(rule, month)) continue;

    const dueDate = dueDateIn(month, rule.day);
    if (dueDate < rule.startDate) continue;
    if (rule.endDate && dueDate > rule.endDate) continue;

    const effective = effectiveDate(dueDate);
    const ref = { billId: rule.id, referenceMonth: month };
    const state = states.find((s) => isSameOccurrence(s, ref));
    // Antes do cadastro, só nasce Pago o que já não dava mais para pagar (Data efetiva passada).
    const isPaid = state ? state.isPaid : effective < rule.registeredOn;
    const amount = state?.amount ?? rule.amount;
    result.push({
      ...ref,
      title: rule.title,
      tags: rule.tags,
      recurrence: rule.recurrence,
      dueDate,
      effectiveDate: effective,
      amount,
      isPaid,
      isOverdue: !isPaid && effective < today,
    });
  }
  return result;
}

function hasDueDateIn(rule: BillRule, month: string): boolean {
  switch (rule.recurrence) {
    case "monthly":
      return true;
    case "yearly":
      return monthNumberOf(month) === rule.month;
    case "once":
      return month === monthOf(rule.startDate);
  }
}

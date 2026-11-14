import { dueDateIn, effectiveDate } from "./business-calendar";
import type { BillRule, Occurrence, OccurrenceState } from "./domain";
import { shiftMonth } from "@/lib/month";

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
    const state = states.find((s) => s.billId === rule.id && s.referenceMonth === month);
    const isPaid = state ? state.isPaid : dueDate < rule.registeredOn;
    const amount = state?.amount ?? rule.amount;
    result.push({
      billId: rule.id,
      title: rule.title,
      tags: rule.tags,
      recurrence: rule.recurrence,
      referenceMonth: month,
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
      return Number(month.slice(5)) === rule.month;
    case "once":
      return month === rule.startDate.slice(0, 7);
  }
}

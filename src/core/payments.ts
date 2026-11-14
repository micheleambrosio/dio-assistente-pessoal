import { isMonth } from "@/lib/month";
import { isSameOccurrence, isValidAmount } from "./domain";
import type { Occurrence, OccurrenceRef } from "./domain";
import { occurrencesBetween } from "./occurrences";
import { updateReminderForOccurrence } from "./reminders";
import type { ReminderDeps } from "./reminders";

export type TogglePaidInput = OccurrenceRef & {
  isPaid: boolean;
  /** Valor pago; vira o Valor do Vencimento. Sem ele, o valor atual fica como está. */
  amount?: number;
};

export type TogglePaidResult = { ok: true } | { ok: false; error: "not_found" | "invalid_amount" };

/** Marca ou desmarca um Vencimento como Pago. */
export async function togglePaid(deps: ReminderDeps, userId: string, input: TogglePaidInput): Promise<TogglePaidResult> {
  const { isPaid, amount, ...ref } = input;
  if (amount !== undefined && !isValidAmount(amount)) return { ok: false, error: "invalid_amount" };
  if (!isMonth(ref.referenceMonth)) return { ok: false, error: "not_found" };

  const found = await findOccurrence(deps, userId, ref);
  if (!found) return { ok: false, error: "not_found" };

  // Só guarda valor quando o Usuário o informou (ou já havia um): o valor da regra não fica congelado.
  const previous = (await deps.repository.listOccurrenceStates(userId)).find((st) => isSameOccurrence(st, ref));
  const finalAmount = amount ?? previous?.amount;
  await deps.repository.saveOccurrenceState(userId, {
    ...ref,
    isPaid,
    ...(finalAmount !== undefined && { amount: finalAmount }),
  });
  // Depois de salvo, o Pago vale mesmo que o Google falhe: o Lembrete fica pendente (ADR 0005).
  await updateReminderForOccurrence(deps, userId, ref, {
    isPaid,
    ...(amount !== undefined && { amount }),
  });
  return { ok: true };
}

async function findOccurrence(deps: ReminderDeps, userId: string, ref: OccurrenceRef): Promise<Occurrence | undefined> {
  const bill = (await deps.repository.listBills(userId)).find((b) => b.id === ref.billId);
  if (!bill) return undefined;
  const states = await deps.repository.listOccurrenceStates(userId);
  return occurrencesBetween(bill, ref.referenceMonth, ref.referenceMonth, deps.clock.today(), states)[0];
}

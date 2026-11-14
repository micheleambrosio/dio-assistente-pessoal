import { isMonth } from "@/lib/month";
import type { Occurrence } from "./domain";
import { occurrencesBetween } from "./occurrences";
import type { CalendarGateway, Clock, Repository } from "./ports";
import { updateReminderForOccurrence } from "./reminders";

export type TogglePaidInput = {
  billId: string;
  /** `YYYY-MM` do Vencimento. */
  referenceMonth: string;
  paid: boolean;
  /** Valor pago; vira o Valor do Vencimento. Sem ele, o valor atual fica como está. */
  amount?: number;
};

export type TogglePaidResult = { ok: true } | { ok: false; error: "not_found" | "invalid_amount" };

type Deps = { repository: Repository; clock: Clock; calendar: CalendarGateway; appUrl: string };

/** Marca ou desmarca um Vencimento como Pago. */
export async function togglePaid(deps: Deps, userId: string, input: TogglePaidInput): Promise<TogglePaidResult> {
  const { billId, referenceMonth, paid, amount } = input;
  if (amount !== undefined && !(Number.isFinite(amount) && amount >= 0 && amount < 1e10)) {
    return { ok: false, error: "invalid_amount" };
  }

  if (!isMonth(referenceMonth)) return { ok: false, error: "not_found" };

  const found = await findOccurrence(deps, userId, billId, referenceMonth);
  if (!found) return { ok: false, error: "not_found" };

  // Só guarda valor quando o Usuário o informou (ou já havia um): o valor da regra não fica congelado.
  const previous = (await deps.repository.listOccurrenceStates(userId)).find(
    (st) => st.billId === billId && st.referenceMonth === referenceMonth,
  );
  const finalAmount = amount ?? previous?.amount;
  await deps.repository.saveOccurrenceState(userId, {
    billId,
    referenceMonth,
    isPaid: paid,
    ...(finalAmount !== undefined && { amount: finalAmount }),
  });
  // Depois de salvo, o Pago vale mesmo que o Google falhe: o Lembrete fica pendente (ADR 0005).
  await updateReminderForOccurrence(deps, userId, billId, referenceMonth, {
    paid,
    ...(amount !== undefined && { amount }),
  });
  return { ok: true };
}

async function findOccurrence(
  deps: Deps,
  userId: string,
  billId: string,
  referenceMonth: string,
): Promise<Occurrence | undefined> {
  const bill = (await deps.repository.listBills(userId)).find((b) => b.id === billId);
  if (!bill) return undefined;
  const states = await deps.repository.listOccurrenceStates(userId);
  return occurrencesBetween(bill, referenceMonth, referenceMonth, deps.clock.today(), states)[0];
}

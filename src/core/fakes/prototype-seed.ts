import type { BillRule } from "../domain";
import type { Repository } from "../ports";
import { dueDateIn } from "../business-calendar";

/** O "hoje" do protótipo: com ele, a Energia de maio (31/05, sábado) tem Data efetiva 02/06 (ADR 0001). */
export const PROTOTYPE_NOW = new Date("2025-06-12T15:00:00Z");
export const PROTOTYPE_USER_ID = "e2e-user";

type Seed = Omit<BillRule, "id" | "startDate" | "registeredOn"> & { startMonth: string };

const MONTHLY_FROM = "2025-02";

/** Os dados mockados do protótipo `prototype/tela-principal` (lib/data.ts), nos tipos do núcleo. */
const BILLS: Seed[] = [
  { title: "Aluguel", recurrence: "monthly", day: 5, amount: 1850, tags: ["housing"], startMonth: MONTHLY_FROM },
  { title: "Condomínio", recurrence: "monthly", day: 5, amount: 620, tags: ["housing"], startMonth: MONTHLY_FROM },
  { title: "Internet Vivo", recurrence: "monthly", day: 15, amount: 119.9, tags: ["utilities", "subscriptions"], startMonth: MONTHLY_FROM },
  { title: "Energia", recurrence: "monthly", day: 31, tags: ["housing", "utilities"], startMonth: MONTHLY_FROM },
  { title: "Água", recurrence: "monthly", day: 10, tags: ["housing", "utilities"], startMonth: MONTHLY_FROM },
  { title: "Cartão Nubank", recurrence: "monthly", day: 10, amount: 2340.12, tags: ["credit_card"], startMonth: MONTHLY_FROM },
  { title: "Academia Smart Fit", recurrence: "monthly", day: 10, amount: 99.9, tags: ["health", "leisure"], startMonth: MONTHLY_FROM },
  { title: "Netflix", recurrence: "monthly", day: 10, amount: 55.9, tags: ["subscriptions", "leisure"], startMonth: MONTHLY_FROM },
  { title: "Plano de saúde", recurrence: "monthly", day: 20, amount: 780, tags: ["health"], startMonth: MONTHLY_FROM },
  { title: "Parcela do notebook", recurrence: "monthly", day: 12, amount: 389.9, tags: ["other"], startMonth: MONTHLY_FROM, endDate: "2025-12-12" },
  { title: "Seguro do carro", recurrence: "yearly", day: 18, month: 6, amount: 2480, tags: ["insurance", "transportation"], startMonth: "2024-06" },
  { title: "Dentista (limpeza)", recurrence: "once", day: 24, month: 6, amount: 350, tags: ["health"], startMonth: "2025-06", endDate: "2025-06-24" },
  { title: "Matrícula do curso de inglês", recurrence: "once", day: 3, month: 7, amount: 450, tags: ["education"], startMonth: "2025-07", endDate: "2025-07-03" },
];

/** Vencimentos passados que continuam sem pagamento (viram Atrasados), por título e Mês de referência. */
const UNPAID: [string, string][] = [["Energia", "2025-05"], ["Condomínio", "2025-06"], ["Água", "2025-06"]];
/** Vencimentos futuros já pagos antecipadamente. */
const PAID_AHEAD: [string, string][] = [["Internet Vivo", "2025-06"]];
/** Valor do Vencimento que substitui o da Conta naquele mês (Vencimentos com valor pago). */
const AMOUNT_OF_MONTH: [string, string, number, boolean][] = [
  ["Energia", "2025-05", 187.4, false],
  ["Energia", "2025-04", 201.15, true],
  ["Água", "2025-05", 74.3, true],
];

/** Carrega no repositório o mês do protótipo. O Usuário é `PROTOTYPE_USER_ID`; o "hoje" é `PROTOTYPE_NOW`. */
export async function seedPrototype(repository: Repository, userId = PROTOTYPE_USER_ID): Promise<void> {
  const ids = new Map<string, string>();
  for (const { startMonth, ...bill } of BILLS) {
    const startDate = dueDateIn(startMonth, bill.day);
    // Vencimentos anteriores a este dia nascem Pagos; os UNPAID abaixo escapam disso.
    const id = await repository.saveBill(userId, { ...bill, startDate, registeredOn: PROTOTYPE_NOW.toISOString().slice(0, 10) });
    ids.set(bill.title, id);
  }

  const state = async (title: string, referenceMonth: string, isPaid: boolean, amount?: number) =>
    repository.saveOccurrenceState(userId, {
      billId: ids.get(title)!,
      referenceMonth,
      isPaid,
      ...(amount !== undefined && { amount }),
    });

  for (const [title, month] of UNPAID) await state(title, month, false);
  for (const [title, month] of PAID_AHEAD) await state(title, month, true);
  for (const [title, month, amount, isPaid] of AMOUNT_OF_MONTH) await state(title, month, isPaid, amount);
}


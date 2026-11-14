import { shiftMonth } from "@/lib/month";
import { TAG_LABELS } from "@/lib/labels";
import type { BillRule, Reminder } from "./domain";
import { occurrencesBetween } from "./occurrences";
import { ensureBillsCalendar } from "./ensure-bills-calendar";
import type { CalendarGateway, Clock, Repository, ReminderEvent } from "./ports";
import { GoogleAuthError } from "./ports";

export type ReminderDeps = { repository: Repository; calendar: CalendarGateway; clock: Clock; appUrl: string };

/** Quantos Vencimentos à frente cada Conta mantém no Calendar (ADR 0002). */
export const WINDOW_SIZE = 12;
const SEARCH_MONTHS = 12 * WINDOW_SIZE; // alcança 12 Vencimentos até de Contas anuais

const TIME_ZONE = "America/Sao_Paulo";

/**
 * Grava no app os Lembretes que faltam para a Conta e tenta criá-los no Calendar.
 * Nunca lança: o app é a fonte da verdade (ADR 0005) e `syncOnAppOpen` retoma o que falhou.
 */
export async function createRemindersForBill(deps: ReminderDeps, userId: string, rule: BillRule): Promise<void> {
  try {
    await extendWindow(deps, userId, rule, await deps.repository.listReminders(userId));
    await pushPending(deps, userId);
  } catch {
    // Fica para a próxima abertura do app.
  }
}

async function extendWindow(deps: ReminderDeps, userId: string, rule: BillRule, all: Reminder[]) {
  const today = deps.clock.today();
  const states = await deps.repository.listOccurrenceStates(userId);
  const mine = all.filter((r) => r.billId === rule.id && r.syncStatus !== "pending_delete");
  const lastReference = mine.map((r) => r.referenceMonth).sort().at(-1);
  const lastReminderMonth = mine.map((r) => r.effectiveDate.slice(0, 7)).sort().at(-1);
  if (lastReminderMonth && today.slice(0, 7) < lastReminderMonth) return; // a Janela ainda tem folga

  const firstMonth = lastReference ? shiftMonth(lastReference, 1) : rule.startDate.slice(0, 7);
  // O Vencimento do mês anterior pode ter Data efetiva neste mês.
  const from = [firstMonth, shiftMonth(today.slice(0, 7), -1)].sort().at(-1)!;

  const fresh = occurrencesBetween(rule, from, shiftMonth(from, SEARCH_MONTHS), today, states)
    .filter((o) => o.dueDate >= rule.registeredOn && o.effectiveDate >= today)
    .slice(0, WINDOW_SIZE);

  await deps.repository.saveReminders(
    userId,
    fresh.map((o) => ({
      billId: rule.id,
      referenceMonth: o.referenceMonth,
      effectiveDate: o.effectiveDate,
      title: o.title,
      tags: o.tags,
      paid: o.isPaid,
      syncStatus: "pending_create" as const,
      ...(o.amount !== undefined && { amount: o.amount }),
    })),
  );
}

/**
 * Reflete no Lembrete o que mudou no Vencimento (Pago, valor) e tenta mandar ao Google.
 * Sem Lembrete (fora da Janela), não há o que fazer. Falhas do Google viram pendência (ADR 0005).
 */
export async function updateReminderForOccurrence(
  deps: ReminderDeps,
  userId: string,
  billId: string,
  referenceMonth: string,
  change: { paid: boolean; amount?: number },
): Promise<void> {
  const reminder = (await deps.repository.listReminders(userId)).find(
    (r) => r.billId === billId && r.referenceMonth === referenceMonth && r.syncStatus !== "pending_delete",
  );
  if (!reminder) return;
  // Gravar a pendência no app tem de dar certo; só o Google pode falhar em silêncio.
  await deps.repository.updateReminder(userId, reminder.id, {
    paid: change.paid,
    ...(change.amount !== undefined && { amount: change.amount }),
    // Um Lembrete que ainda não existe no Google só precisa nascer com o conteúdo novo.
    syncStatus: reminder.syncStatus === "pending_create" ? "pending_create" : "pending_update",
  });
  try {
    await pushPending(deps, userId);
  } catch {
    // Fica para a próxima abertura do app.
  }
}

/** Depois de o Usuário reconectar a conta Google: limpa o aviso e sincroniza as pendências. */
export async function reconnectGoogle(deps: ReminderDeps, userId: string): Promise<SyncStatus> {
  await deps.repository.setAccessRevoked(userId, false);
  return syncOnAppOpen(deps, userId);
}

export type SyncStatus = { pendingCount: number; accessRevoked: boolean };

/**
 * Chamada ao abrir o app (e pela ação "tentar agora"): retoma os Lembretes pendentes
 * e devolve o que a tela precisa mostrar. Nunca lança por causa do Google.
 */
export async function syncOnAppOpen(deps: ReminderDeps, userId: string): Promise<SyncStatus> {
  try {
    // Grava primeiro no app; o Calendar vem depois (ADR 0005).
    const reminders = await deps.repository.listReminders(userId);
    for (const bill of await deps.repository.listBills(userId)) await extendWindow(deps, userId, bill, reminders);
    await pushPending(deps, userId);
  } catch {
    // O motivo já foi gravado em cada Lembrete; a tela mostra a contagem.
  }
  return syncStatus(deps.repository, userId);
}

async function syncStatus(repository: Repository, userId: string): Promise<SyncStatus> {
  const reminders = await repository.listReminders(userId);
  return {
    pendingCount: reminders.filter((r) => r.syncStatus !== "synced").length,
    accessRevoked: await repository.isAccessRevoked(userId),
  };
}

async function pushPending(deps: ReminderDeps, userId: string) {
  const { repository, calendar } = deps;
  if (await repository.isAccessRevoked(userId)) return;
  if ((await repository.listReminders(userId)).length === 0) return;

  // Mesmo sem pendências, confere a Agenda de contas: o Usuário pode ter apagado no Google.
  const storedId = await repository.getBillsCalendarId(userId);
  let calendarId: string;
  try {
    calendarId = await ensureBillsCalendar({ repository, calendar }, userId);
  } catch (error) {
    await fail(deps, userId, await pendingOf(repository, userId), error);
    return;
  }
  if (storedId && storedId !== calendarId) await resetAfterRecreation(repository, userId, deps.clock.today());

  for (const reminder of await pendingOf(repository, userId)) {
    try {
      await push(deps, userId, calendarId, reminder);
    } catch (error) {
      await fail(deps, userId, [reminder], error);
      if (error instanceof GoogleAuthError) return;
    }
  }
}

async function pendingOf(repository: Repository, userId: string) {
  return (await repository.listReminders(userId)).filter((r) => r.syncStatus !== "synced");
}

/** A agenda nova está vazia: recria só os Lembretes da Janela atual (de hoje em diante). */
async function resetAfterRecreation(repository: Repository, userId: string, today: string) {
  for (const reminder of await repository.listReminders(userId)) {
    if (reminder.syncStatus === "pending_delete") await repository.deleteReminder(userId, reminder.id);
    else if (reminder.effectiveDate >= today) await repository.updateReminder(userId, reminder.id, { syncStatus: "pending_create", googleEventId: undefined });
  }
}

async function push(deps: ReminderDeps, userId: string, calendarId: string, reminder: Reminder) {
  const { repository, calendar } = deps;
  const { googleEventId } = reminder;

  if (reminder.syncStatus === "pending_delete") {
    if (googleEventId) await calendar.deleteReminder(userId, calendarId, googleEventId);
    await repository.deleteReminder(userId, reminder.id);
    return;
  }

  const event = eventFor(reminder, deps.appUrl, deps.clock.today());
  if (reminder.syncStatus === "pending_update" && googleEventId) {
    await calendar.updateReminder(userId, calendarId, googleEventId, event);
    await repository.updateReminder(userId, reminder.id, { syncStatus: "synced", lastError: undefined });
    return;
  }

  const eventId = await calendar.createReminder(userId, calendarId, event);
  await repository.updateReminder(userId, reminder.id, { syncStatus: "synced", googleEventId: eventId, lastError: undefined });
}

async function fail(deps: ReminderDeps, userId: string, reminders: Reminder[], error: unknown) {
  if (error instanceof GoogleAuthError) await deps.repository.setAccessRevoked(userId, true);
  await Promise.all(reminders.map((r) => deps.repository.updateReminder(userId, r.id, { lastError: messageOf(error) })));
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function eventFor(reminder: Reminder, appUrl: string, today: string): ReminderEvent {
  const base = reminder.amount === undefined ? reminder.title : `${reminder.title}: ${formatMoney(reminder.amount)}`;
  const summary = reminder.paid ? `✅ ${base}` : base;
  // Pago não avisa; depois da Data efetiva também não há mais o que avisar.
  const notify = !reminder.paid && reminder.effectiveDate >= today;
  return {
    summary,
    description: `Etiquetas: ${reminder.tags.map((t) => TAG_LABELS[t]).join(", ")}\n${appUrl}`,
    start: `${reminder.effectiveDate}T09:00:00`,
    end: `${reminder.effectiveDate}T09:15:00`,
    timeZone: TIME_ZONE,
    popupMinutesBefore: notify ? 0 : null,
  };
}

function formatMoney(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

import type { CalendarGateway, Clock, Repository } from "./ports";

export const BILLS_CALENDAR_NAME = "Contas do mês";

type Deps = { repository: Repository; calendar: CalendarGateway; clock: Clock };

/**
 * Devolve a Agenda de contas do Usuário, criando-a se ainda não existe ou se ele a apagou no Google.
 * Na recriação, os Lembretes voltam a pendentes antes de o id novo ser gravado: se algo falhar no
 * meio, a próxima chamada ainda vê o id antigo, recria e reseta de novo.
 */
export async function ensureBillsCalendar(deps: Deps, userId: string): Promise<string> {
  const { repository, calendar } = deps;

  const stored = await repository.getBillsCalendarId(userId);
  if (stored && (await calendar.billsCalendarExists(userId, stored))) return stored;

  const created = await calendar.createBillsCalendar(userId, BILLS_CALENDAR_NAME);

  let winner: string;
  try {
    if (stored) await resetRemindersForNewCalendar(repository, userId, deps.clock.today());
    winner = await repository.claimBillsCalendarId(userId, created, stored);
  } catch (error) {
    await calendar.deleteBillsCalendar(userId, created).catch(() => {});
    throw error;
  }

  // Outra chamada concorrente guardou o id primeiro: a nossa agenda é sobra.
  if (winner !== created) await calendar.deleteBillsCalendar(userId, created);
  return winner;
}

/** A agenda nova está vazia: recria só os Lembretes da Janela atual (de hoje em diante). */
async function resetRemindersForNewCalendar(repository: Repository, userId: string, today: string) {
  for (const reminder of await repository.listReminders(userId)) {
    if (reminder.syncStatus === "pending_delete") await repository.deleteReminder(userId, reminder.id);
    else if (reminder.effectiveDate >= today) {
      await repository.updateReminder(userId, reminder.id, { syncStatus: "pending_create", googleEventId: undefined });
    }
  }
}

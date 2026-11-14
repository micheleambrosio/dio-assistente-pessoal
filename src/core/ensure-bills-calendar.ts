import type { CalendarGateway, Repository } from "./ports";

export const BILLS_CALENDAR_NAME = "Contas do mês";

export async function ensureBillsCalendar(
  deps: { repository: Repository; calendar: CalendarGateway },
  userId: string,
): Promise<string> {
  const { repository, calendar } = deps;

  const stored = await repository.getBillsCalendarId(userId);
  if (stored && (await calendar.billsCalendarExists(userId, stored))) return stored;

  const created = await calendar.createBillsCalendar(userId, BILLS_CALENDAR_NAME);

  let winner: string;
  try {
    winner = await repository.claimBillsCalendarId(userId, created, stored);
  } catch (error) {
    await calendar.deleteBillsCalendar(userId, created).catch(() => {});
    throw error;
  }

  // Outra chamada concorrente guardou o id primeiro: a nossa agenda é sobra.
  if (winner !== created) await calendar.deleteBillsCalendar(userId, created);
  return winner;
}

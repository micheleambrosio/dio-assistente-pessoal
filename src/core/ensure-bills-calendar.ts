import type { CalendarGateway, Repository } from "./ports";

export const BILLS_CALENDAR_NAME = "Contas do mês";

export async function ensureBillsCalendar(
  deps: { repository: Repository; calendar: CalendarGateway },
  userId: string,
): Promise<string> {
  const existing = await deps.repository.getBillsCalendarId(userId);
  if (existing) return existing;

  const id = await deps.calendar.createBillsCalendar(userId, BILLS_CALENDAR_NAME);
  await deps.repository.saveBillsCalendarId(userId, id);
  return id;
}

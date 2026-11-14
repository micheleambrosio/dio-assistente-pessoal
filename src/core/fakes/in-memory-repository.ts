import type { Repository } from "../ports";

export class InMemoryRepository implements Repository {
  private billsCalendarIds = new Map<string, string>();

  async getBillsCalendarId(userId: string) {
    return this.billsCalendarIds.get(userId) ?? null;
  }

  async saveBillsCalendarId(userId: string, calendarId: string) {
    this.billsCalendarIds.set(userId, calendarId);
  }
}

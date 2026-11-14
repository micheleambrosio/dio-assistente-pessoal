import type { Repository } from "../ports";

export class InMemoryRepository implements Repository {
  private billsCalendarIds = new Map<string, string>();

  async getBillsCalendarId(userId: string) {
    return this.billsCalendarIds.get(userId) ?? null;
  }

  async claimBillsCalendarId(userId: string, calendarId: string, replacing: string | null) {
    const current = this.billsCalendarIds.get(userId) ?? null;
    if (current !== replacing) return current!;
    this.billsCalendarIds.set(userId, calendarId);
    return calendarId;
  }
}

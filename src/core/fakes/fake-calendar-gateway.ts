import type { CalendarGateway } from "../ports";

export class FakeCalendarGateway implements CalendarGateway {
  created: { userId: string; name: string }[] = [];

  async createBillsCalendar(userId: string, name: string) {
    this.created.push({ userId, name });
    return `calendar-${this.created.length}`;
  }
}

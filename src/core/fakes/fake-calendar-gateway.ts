import type { CalendarGateway } from "../ports";

export class FakeCalendarGateway implements CalendarGateway {
  created: { userId: string; name: string }[] = [];
  private calendars = new Set<string>();
  private counter = 0;

  async createBillsCalendar(userId: string, name: string) {
    await Promise.resolve(); // cede a vez, como uma chamada de rede
    this.created.push({ userId, name });
    const id = `calendar-${++this.counter}`;
    this.calendars.add(id);
    return id;
  }

  async billsCalendarExists(_userId: string, calendarId: string) {
    return this.calendars.has(calendarId);
  }

  async deleteBillsCalendar(_userId: string, calendarId: string) {
    this.calendars.delete(calendarId);
  }

  /** Simula o Usuário apagando a agenda direto no Google. */
  deleteExternally(calendarId: string) {
    this.calendars.delete(calendarId);
  }

  existingIds() {
    return [...this.calendars];
  }
}

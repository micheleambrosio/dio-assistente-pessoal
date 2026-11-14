import type { CalendarGateway, ReminderEvent } from "../ports";

export class FakeCalendarGateway implements CalendarGateway {
  created: { userId: string; name: string }[] = [];
  private calendars = new Set<string>();
  private eventsById = new Map<string, { calendarId: string; event: ReminderEvent }>();
  private failure: Error | null = null;
  private counter = 0;

  async createBillsCalendar(userId: string, name: string) {
    await Promise.resolve(); // cede a vez, como uma chamada de rede
    this.created.push({ userId, name });
    const id = `calendar-${++this.counter}`;
    this.calendars.add(id);
    return id;
  }

  async billsCalendarExists(_userId: string, calendarId: string) {
    this.throwIfFailing();
    return this.calendars.has(calendarId);
  }

  async deleteBillsCalendar(_userId: string, calendarId: string) {
    this.calendars.delete(calendarId);
    this.dropEventsOf(calendarId);
  }

  async createReminder(_userId: string, calendarId: string, event: ReminderEvent) {
    this.throwIfFailing();
    const id = `event-${++this.counter}`;
    this.eventsById.set(id, { calendarId, event });
    return id;
  }

  async updateReminder(_userId: string, calendarId: string, eventId: string, event: ReminderEvent) {
    this.throwIfFailing();
    this.eventsById.set(eventId, { calendarId, event });
  }

  async deleteReminder(_userId: string, _calendarId: string, eventId: string) {
    this.throwIfFailing();
    this.eventsById.delete(eventId);
  }

  /** Simula o Usuário apagando a agenda direto no Google. */
  deleteExternally(calendarId: string) {
    this.calendars.delete(calendarId);
    this.dropEventsOf(calendarId);
  }

  /** Faz toda chamada a eventos (e a consulta da agenda) falhar com `error`; `null` volta ao normal. */
  failWith(error: Error | null) {
    this.failure = error;
  }

  existingIds() {
    return [...this.calendars];
  }

  events() {
    return [...this.eventsById.entries()].map(([id, { calendarId, event }]) => ({ id, calendarId, event }));
  }

  private throwIfFailing() {
    if (this.failure) throw this.failure;
  }

  private dropEventsOf(calendarId: string) {
    for (const [id, value] of this.eventsById) if (value.calendarId === calendarId) this.eventsById.delete(id);
  }
}

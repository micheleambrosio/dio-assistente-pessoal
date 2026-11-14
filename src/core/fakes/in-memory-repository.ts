import type { BillRule, OccurrenceState, Reminder } from "../domain";
import type { Repository } from "../ports";

export class InMemoryRepository implements Repository {
  private billsCalendarIds = new Map<string, string>();
  private bills = new Map<string, BillRule[]>();
  private reminders = new Map<string, Reminder[]>();
  private states = new Map<string, OccurrenceState[]>();
  private revoked = new Set<string>();
  private counter = 0;

  async getBillsCalendarId(userId: string) {
    return this.billsCalendarIds.get(userId) ?? null;
  }

  async claimBillsCalendarId(userId: string, calendarId: string, replacing: string | null) {
    const current = this.billsCalendarIds.get(userId) ?? null;
    if (current !== replacing) return current!;
    this.billsCalendarIds.set(userId, calendarId);
    return calendarId;
  }

  async saveBill(userId: string, rule: Omit<BillRule, "id">) {
    const id = `bill-${++this.counter}`;
    this.bills.set(userId, [...(this.bills.get(userId) ?? []), { ...rule, id }]);
    return id;
  }

  async listBills(userId: string) {
    return this.bills.get(userId) ?? [];
  }

  async listOccurrenceStates(userId: string) {
    return (this.states.get(userId) ?? []).map((s) => ({ ...s }));
  }

  async saveOccurrenceState(userId: string, state: OccurrenceState) {
    const others = (this.states.get(userId) ?? []).filter(
      (s) => !(s.billId === state.billId && s.referenceMonth === state.referenceMonth),
    );
    this.states.set(userId, [...others, { ...state }]);
  }

  async listReminders(userId: string) {
    return (this.reminders.get(userId) ?? []).map((r) => ({ ...r }));
  }

  async saveReminders(userId: string, reminders: Omit<Reminder, "id">[]) {
    const saved = reminders.map((r) => ({ ...r, id: `reminder-${++this.counter}` }));
    this.reminders.set(userId, [...(this.reminders.get(userId) ?? []), ...saved]);
    return saved.map((r) => ({ ...r }));
  }

  async updateReminder(
    userId: string,
    id: string,
    patch: Partial<Pick<Reminder, "syncStatus" | "googleEventId" | "lastError" | "paid" | "amount">>,
  ) {
    const reminder = (this.reminders.get(userId) ?? []).find((r) => r.id === id);
    if (!reminder) return;
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete (reminder as Record<string, unknown>)[key];
      else (reminder as Record<string, unknown>)[key] = value;
    }
  }

  async deleteReminder(userId: string, id: string) {
    this.reminders.set(userId, (this.reminders.get(userId) ?? []).filter((r) => r.id !== id));
  }

  async isAccessRevoked(userId: string) {
    return this.revoked.has(userId);
  }

  async setAccessRevoked(userId: string, revoked: boolean) {
    if (revoked) this.revoked.add(userId);
    else this.revoked.delete(userId);
  }
}

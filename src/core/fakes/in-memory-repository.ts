import type { BillRule } from "../domain";
import type { Repository } from "../ports";

export class InMemoryRepository implements Repository {
  private billsCalendarIds = new Map<string, string>();
  private bills = new Map<string, BillRule[]>();
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
}

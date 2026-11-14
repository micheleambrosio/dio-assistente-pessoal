import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillRule, OccurrenceState, Recurrence, Reminder, ReminderSyncStatus, Tag } from "@/core/domain";
import type { Repository } from "@/core/ports";

export class SupabaseRepository implements Repository {
  constructor(private readonly client: SupabaseClient) {}

  async getBillsCalendarId(userId: string) {
    const { data, error } = await this.client
      .from("user_settings")
      .select("bills_calendar_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.bills_calendar_id ?? null;
  }

  async claimBillsCalendarId(userId: string, calendarId: string, replacing: string | null) {
    if (replacing === null) {
      // Atômico: só a primeira inserção vence (user_id é chave primária).
      const { error } = await this.client
        .from("user_settings")
        .upsert({ user_id: userId, bills_calendar_id: calendarId }, { onConflict: "user_id", ignoreDuplicates: true });
      if (error) throw error;
    } else {
      // Compare-and-set: só troca se o id ainda for o que lemos.
      const { error } = await this.client
        .from("user_settings")
        .update({ bills_calendar_id: calendarId })
        .eq("user_id", userId)
        .eq("bills_calendar_id", replacing);
      if (error) throw error;
    }
    return (await this.getBillsCalendarId(userId)) ?? calendarId;
  }

  async saveBill(_userId: string, rule: Omit<BillRule, "id">) {
    const { data, error } = await this.client.rpc("create_bill", {
      p_registered_on: rule.registeredOn,
      p_title: rule.title,
      p_amount: rule.amount ?? null,
      p_recurrence: rule.recurrence,
      p_day: rule.day,
      p_month: rule.month ?? null,
      p_start_date: rule.startDate,
      p_end_date: rule.endDate ?? null,
      p_tags: rule.tags,
    });
    if (error) throw error;
    return data as string;
  }

  async listBills(userId: string) {
    const { data, error } = await this.client
      .from("bills")
      .select("id, registered_on, bill_revisions(effective_from, title, amount, recurrence, day, month, start_date, end_date, tags)")
      .eq("user_id", userId);
    if (error) throw error;

    return (data ?? []).flatMap((bill): BillRule[] => {
      // A revisão vigente é a mais recente. Esta fatia só cria a primeira.
      const [revision] = [...bill.bill_revisions].sort((a, b) => b.effective_from.localeCompare(a.effective_from));
      if (!revision) return [];
      return [
        {
          id: bill.id,
          registeredOn: bill.registered_on,
          title: revision.title,
          recurrence: revision.recurrence as Recurrence,
          day: revision.day,
          startDate: revision.start_date,
          tags: revision.tags as Tag[],
          ...(revision.amount !== null && { amount: Number(revision.amount) }),
          ...(revision.month !== null && { month: revision.month }),
          ...(revision.end_date !== null && { endDate: revision.end_date }),
        },
      ];
    });
  }

  async listOccurrenceStates(userId: string) {
    const { data, error } = await this.client
      .from("occurrence_states")
      .select("bill_id, reference_month, is_paid, amount")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).map(
      (row): OccurrenceState => ({
        billId: row.bill_id,
        referenceMonth: row.reference_month,
        isPaid: row.is_paid,
        ...(row.amount !== null && { amount: Number(row.amount) }),
      }),
    );
  }

  async saveOccurrenceState(userId: string, state: OccurrenceState) {
    const { error } = await this.client.from("occurrence_states").upsert(
      {
        user_id: userId,
        bill_id: state.billId,
        reference_month: state.referenceMonth,
        is_paid: state.isPaid,
        amount: state.amount ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "bill_id,reference_month" },
    );
    if (error) throw error;
  }

  async listReminders(userId: string) {
    const { data, error } = await this.client
      .from("reminders")
      .select("id, bill_id, reference_month, effective_date, title, amount, tags, paid, sync_status, google_event_id, last_error")
      .eq("user_id", userId)
      .order("effective_date");
    if (error) throw error;
    return (data ?? []).map(
      (row): Reminder => ({
        id: row.id,
        billId: row.bill_id,
        referenceMonth: row.reference_month,
        effectiveDate: row.effective_date,
        title: row.title,
        tags: row.tags as Tag[],
        paid: row.paid,
        syncStatus: row.sync_status as ReminderSyncStatus,
        ...(row.amount !== null && { amount: Number(row.amount) }),
        ...(row.google_event_id !== null && { googleEventId: row.google_event_id }),
        ...(row.last_error !== null && { lastError: row.last_error }),
      }),
    );
  }

  async saveReminders(userId: string, reminders: Omit<Reminder, "id">[]) {
    if (reminders.length === 0) return [];
    const { data, error } = await this.client
      .from("reminders")
      .upsert(
        reminders.map((r) => ({
          user_id: userId,
          bill_id: r.billId,
          reference_month: r.referenceMonth,
          effective_date: r.effectiveDate,
          title: r.title,
          amount: r.amount ?? null,
          tags: r.tags,
          paid: r.paid,
          sync_status: r.syncStatus,
          google_event_id: r.googleEventId ?? null,
          last_error: r.lastError ?? null,
        })),
        // Duas aberturas simultâneas não duplicam o Lembrete do mesmo Vencimento.
        { onConflict: "bill_id,reference_month", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw error;
    return (await this.listReminders(userId)).filter((r) => data?.some((d) => d.id === r.id));
  }

  async updateReminder(
    userId: string,
    id: string,
    patch: Partial<Pick<Reminder, "syncStatus" | "googleEventId" | "lastError" | "paid" | "amount">>,
  ) {
    const columns: Record<string, unknown> = {};
    if ("syncStatus" in patch) columns.sync_status = patch.syncStatus;
    if ("googleEventId" in patch) columns.google_event_id = patch.googleEventId ?? null;
    if ("lastError" in patch) columns.last_error = patch.lastError ?? null;
    if ("paid" in patch) columns.paid = patch.paid;
    if ("amount" in patch) columns.amount = patch.amount ?? null;
    const { error } = await this.client.from("reminders").update(columns).eq("user_id", userId).eq("id", id);
    if (error) throw error;
  }

  async deleteReminder(userId: string, id: string) {
    const { error } = await this.client.from("reminders").delete().eq("user_id", userId).eq("id", id);
    if (error) throw error;
  }

  async isAccessRevoked(userId: string) {
    const { data, error } = await this.client
      .from("user_settings")
      .select("access_revoked")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.access_revoked ?? false;
  }

  async setAccessRevoked(userId: string, revoked: boolean) {
    const { error } = await this.client
      .from("user_settings")
      .upsert({ user_id: userId, access_revoked: revoked }, { onConflict: "user_id" });
    if (error) throw error;
  }
}

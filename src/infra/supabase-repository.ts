import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillRule, Recurrence, Tag } from "@/core/domain";
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
}

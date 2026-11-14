import type { SupabaseClient } from "@supabase/supabase-js";
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
}

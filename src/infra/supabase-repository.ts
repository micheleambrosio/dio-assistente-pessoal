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

  async saveBillsCalendarId(userId: string, calendarId: string) {
    const { error } = await this.client
      .from("user_settings")
      .upsert({ user_id: userId, bills_calendar_id: calendarId });
    if (error) throw error;
  }
}

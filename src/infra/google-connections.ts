import { createServiceClient } from "./supabase";
import { decryptToken, encryptToken } from "./token-crypto";

export async function saveRefreshToken(userId: string, refreshToken: string) {
  const { error } = await createServiceClient()
    .from("google_connections")
    .upsert({
      user_id: userId,
      refresh_token_encrypted: encryptToken(refreshToken),
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function loadRefreshToken(userId: string): Promise<string | null> {
  const { data, error } = await createServiceClient()
    .from("google_connections")
    .select("refresh_token_encrypted")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? decryptToken(data.refresh_token_encrypted) : null;
}

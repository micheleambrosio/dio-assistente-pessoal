"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createUserClient } from "@/infra/supabase";

export async function signInWithGoogle() {
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL!;
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      // openid, email e profile já vêm por padrão; só este escopo extra (ADR 0003).
      scopes: "https://www.googleapis.com/auth/calendar.app.created",
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

/** Encerra a sessão. Não apaga Contas nem a conexão com o Google (google_connections). */
export async function signOut() {
  const supabase = await createUserClient();
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Falha ao encerrar a sessão", error);
  redirect("/login");
}

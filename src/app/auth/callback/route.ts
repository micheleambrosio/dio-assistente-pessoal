import { NextResponse, type NextRequest } from "next/server";
import { SaoPauloClock } from "@/core/clock";
import { reconnectGoogle } from "@/core/reminders";
import { appUrl } from "@/infra/app-url";
import { ensureBillsCalendar } from "@/core/ensure-bills-calendar";
import { GoogleCalendarGateway } from "@/infra/google-calendar-gateway";
import { saveRefreshToken } from "@/infra/google-connections";
import { createUserClient } from "@/infra/supabase";
import { SupabaseRepository } from "@/infra/supabase-repository";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/login?error=oauth`);

  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) return NextResponse.redirect(`${origin}/login?error=oauth`);

  const { session } = data;
  const userId = session.user.id;

  // O refresh token só vem do Google no consentimento; fica criptografado no servidor.
  if (session.provider_refresh_token) {
    await saveRefreshToken(userId, session.provider_refresh_token);
  }

  // Se a Agenda de contas falhar, a tela principal tenta de novo e avisa o Usuário.
  try {
    const repository = new SupabaseRepository(supabase);
    const calendar = new GoogleCalendarGateway();
    // Reconectar limpa o aviso de acesso revogado e sincroniza as pendências. Vem primeiro
    // para que uma falha ao criar a agenda não deixe o aviso preso.
    const deps = { repository, calendar, clock: new SaoPauloClock(), appUrl: appUrl() };
    await reconnectGoogle(deps, userId);
    await ensureBillsCalendar(deps, userId);
  } catch (e) {
    console.error("Falha ao garantir a Agenda de contas", e);
  }

  return NextResponse.redirect(`${origin}/`);
}

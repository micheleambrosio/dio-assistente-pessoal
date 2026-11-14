"use server";

import { revalidatePath } from "next/cache";
import { SaoPauloClock } from "@/core/clock";
import { confirmPreview, correctPreview, interpretCommand } from "@/core/commands";
import type { ConfirmResult, PreviewResult } from "@/core/commands";
import type { Preview } from "@/core/domain";
import { syncOnAppOpen } from "@/core/reminders";
import type { SyncStatus } from "@/core/reminders";
import { appUrl } from "@/infra/app-url";
import { GoogleCalendarGateway } from "@/infra/google-calendar-gateway";
import { GeminiCommandInterpreter } from "@/infra/gemini-command-interpreter";
import { createUserClient } from "@/infra/supabase";
import { SupabaseRepository } from "@/infra/supabase-repository";

async function context() {
  const supabase = await createUserClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Não autenticado");
  return {
    userId: data.user.id,
    deps: {
      repository: new SupabaseRepository(supabase),
      interpreter: new GeminiCommandInterpreter(),
      clock: new SaoPauloClock(),
      calendar: new GoogleCalendarGateway(),
      appUrl: appUrl(),
    },
  };
}

export type CommandFailure = { ok: false; error: "not_understood" | "invalid_preview" | "unavailable" };

export async function interpretCommandAction(text: string): Promise<PreviewResult | CommandFailure> {
  const { userId, deps } = await context();
  try {
    return await interpretCommand(deps, userId, text.slice(0, 500));
  } catch (e) {
    console.error("Falha ao interpretar o Comando", e);
    return { ok: false, error: "unavailable" };
  }
}

export async function correctPreviewAction(preview: Preview, correction: string): Promise<PreviewResult | CommandFailure> {
  const { userId, deps } = await context();
  try {
    return await correctPreview(deps, userId, preview, correction.slice(0, 500));
  } catch (e) {
    console.error("Falha ao corrigir a Prévia", e);
    return { ok: false, error: "unavailable" };
  }
}

export async function confirmPreviewAction(preview: Preview): Promise<ConfirmResult | CommandFailure> {
  const { userId, deps } = await context();
  try {
    return await confirmPreview(deps, userId, preview);
  } catch (e) {
    console.error("Falha ao salvar a Conta", e);
    return { ok: false, error: "unavailable" };
  }
}

/** "Tentar agora": retoma os Lembretes pendentes na hora. */
export async function retryRemindersAction(): Promise<SyncStatus | { error: "unavailable" }> {
  const { userId, deps } = await context();
  try {
    const status = await syncOnAppOpen(deps, userId);
    revalidatePath("/");
    return status;
  } catch (e) {
    console.error("Falha ao sincronizar os Lembretes", e);
    return { error: "unavailable" };
  }
}

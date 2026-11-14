"use server";

import { SaoPauloClock } from "@/core/clock";
import { confirmPreview, correctPreview, interpretCommand } from "@/core/commands";
import type { ConfirmResult, PreviewResult } from "@/core/commands";
import type { Preview } from "@/core/domain";
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

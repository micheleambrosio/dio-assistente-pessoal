"use server";

import { revalidatePath } from "next/cache";
import { confirmPreview, correctPreview, interpretCommand, interpretVoiceCommand } from "@/core/commands";
import type { ConfirmResult, PreviewResult } from "@/core/commands";
import type { Preview } from "@/core/domain";
import { togglePaid } from "@/core/payments";
import type { TogglePaidInput, TogglePaidResult } from "@/core/payments";
import { syncOnAppOpen } from "@/core/reminders";
import type { SyncStatus } from "@/core/reminders";
import { getRuntime } from "@/infra/runtime";

async function context() {
  const runtime = await getRuntime();
  if (!runtime) throw new Error("Não autenticado");
  const { userId, ...deps } = runtime;
  return { userId, deps };
}

export type CommandFailure = { ok: false; error: "not_understood" | "invalid_preview" | "invalid_audio" | "unavailable" };

export async function interpretCommandAction(text: string): Promise<PreviewResult | CommandFailure> {
  const { userId, deps } = await context();
  try {
    return await interpretCommand(deps, userId, text.slice(0, 500));
  } catch (e) {
    console.error("Falha ao interpretar o Comando", e);
    return { ok: false, error: "unavailable" };
  }
}

/** Comando falado: recebe o áudio gravado (campo `audio` do FormData). */
export async function interpretVoiceCommandAction(form: FormData): Promise<PreviewResult | CommandFailure> {
  const { userId, deps } = await context();
  const file = form.get("audio");
  if (!(file instanceof Blob)) return { ok: false, error: "invalid_audio" };
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    // O navegador manda "audio/webm;codecs=opus"; a IA só precisa do tipo base.
    const mimeType = file.type.split(";")[0];
    return await interpretVoiceCommand(deps, userId, { data, mimeType });
  } catch (e) {
    console.error("Falha ao interpretar o Comando de voz", e);
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

/** O check do Vencimento: marca ou desmarca como Pago, com o valor pago opcional. */
export async function togglePaidAction(input: TogglePaidInput): Promise<TogglePaidResult | { ok: false; error: "unavailable" }> {
  const { userId, deps } = await context();
  try {
    const result = await togglePaid(deps, userId, {
      billId: String(input.billId),
      referenceMonth: String(input.referenceMonth),
      paid: input.paid === true,
      ...(typeof input.amount === "number" && { amount: input.amount }),
    });
    revalidatePath("/");
    return result;
  } catch (e) {
    console.error("Falha ao marcar o Vencimento", e);
    return { ok: false, error: "unavailable" };
  }
}

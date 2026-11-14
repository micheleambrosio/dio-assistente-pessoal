"use server";

import { revalidatePath } from "next/cache";
import { confirmPreview, correctPreview, interpretCommand, interpretVoiceCommand } from "@/core/commands";
import type { ConfirmResult, PreviewResult } from "@/core/commands";
import type { Preview } from "@/core/domain";
import { togglePaid } from "@/core/payments";
import type { TogglePaidInput, TogglePaidResult } from "@/core/payments";
import { syncReminders } from "@/core/reminders";
import type { RemindersSyncSummary } from "@/core/reminders";
import { getRuntime } from "@/infra/runtime";

async function context() {
  const runtime = await getRuntime();
  if (!runtime) throw new Error("Não autenticado");
  const { userId, ...deps } = runtime;
  return { userId, deps };
}

type Unavailable = { ok: false; error: "unavailable" };

/** Uma falha inesperada (IA, banco, Google) vira "unavailable" para a tela, e o motivo vai para o log. */
async function orUnavailable<T>(failure: string, run: () => Promise<T>): Promise<T | Unavailable> {
  try {
    return await run();
  } catch (e) {
    console.error(failure, e);
    return { ok: false, error: "unavailable" };
  }
}

export type CommandFailure = { ok: false; error: "not_understood" | "invalid_preview" | "invalid_audio" | "unavailable" };

export async function interpretCommandAction(text: string): Promise<PreviewResult | CommandFailure> {
  const { deps } = await context();
  return orUnavailable("Falha ao interpretar o Comando", () => interpretCommand(deps, text.slice(0, 500)));
}

/** Comando falado: recebe o áudio gravado (campo `audio` do FormData). */
export async function interpretVoiceCommandAction(form: FormData): Promise<PreviewResult | CommandFailure> {
  const { deps } = await context();
  const file = form.get("audio");
  if (!(file instanceof Blob)) return { ok: false, error: "invalid_audio" };
  return orUnavailable("Falha ao interpretar o Comando de voz", async () => {
    const data = new Uint8Array(await file.arrayBuffer());
    // O navegador manda "audio/webm;codecs=opus"; a IA só precisa do tipo base.
    const mimeType = file.type.split(";")[0];
    return interpretVoiceCommand(deps, { data, mimeType });
  });
}

export async function correctPreviewAction(preview: Preview, correction: string): Promise<PreviewResult | CommandFailure> {
  const { deps } = await context();
  return orUnavailable("Falha ao corrigir a Prévia", () => correctPreview(deps, preview, correction.slice(0, 500)));
}

export async function confirmPreviewAction(preview: Preview): Promise<ConfirmResult | CommandFailure> {
  const { userId, deps } = await context();
  return orUnavailable("Falha ao salvar a Conta", () => confirmPreview(deps, userId, preview));
}

/** "Tentar agora": retoma os Lembretes pendentes na hora. */
export async function retryRemindersAction(): Promise<RemindersSyncSummary | Unavailable> {
  const { userId, deps } = await context();
  return orUnavailable("Falha ao sincronizar os Lembretes", async () => {
    const summary = await syncReminders(deps, userId);
    revalidatePath("/");
    return summary;
  });
}

/** O check do Vencimento (marca ou desmarca como Pago) e o lápis do valor (mantém o status, troca o valor). */
export async function togglePaidAction(input: TogglePaidInput): Promise<TogglePaidResult | Unavailable> {
  const { userId, deps } = await context();
  return orUnavailable("Falha ao marcar o Vencimento", async () => {
    const result = await togglePaid(deps, userId, {
      billId: String(input.billId),
      referenceMonth: String(input.referenceMonth),
      isPaid: input.isPaid === true,
      ...(typeof input.amount === "number" && { amount: input.amount }),
    });
    revalidatePath("/");
    return result;
  });
}

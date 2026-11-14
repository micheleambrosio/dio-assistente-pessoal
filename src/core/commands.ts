import { isMonth, monthNumberOf, monthOf, shiftMonth, yearOf } from "@/lib/month";
import { dueDateIn, effectiveDate } from "./business-calendar";
import { RECURRENCES, TAGS, isValidAmount } from "./domain";
import type { AudioInput, BillRule, Draft, Preview, Tag } from "./domain";
import type { Clock, CommandInterpreter, Repository } from "./ports";
import { createRemindersForBill } from "./reminders";
import type { ReminderDeps } from "./reminders";

type Deps = { repository: Repository; interpreter: CommandInterpreter; clock: Clock };
type ConfirmDeps = Deps & ReminderDeps;

/** 30 s de áudio compactado ficam bem abaixo disto; o teto barra envios abusivos antes de gastar IA. */
export const MAX_AUDIO_BYTES = 1_000_000;

export type PreviewResult =
  | { ok: true; preview: Preview }
  | { ok: false; error: "not_understood" | "invalid_preview" | "invalid_audio" };

export type ConfirmResult = { ok: true; billId: string } | { ok: false; error: "invalid_preview" };

export async function interpretCommand(deps: Deps, text: string): Promise<PreviewResult> {
  const draft = parseDraft(await deps.interpreter.interpret(text, deps.clock.today()));
  return draft ? buildPreview(draft, text, deps.clock.today()) : { ok: false, error: "not_understood" };
}

/** Comando falado: o áudio vai à IA, que transcreve e interpreta de uma vez. A Prévia mostra a transcrição. */
export async function interpretVoiceCommand(deps: Deps, audio: AudioInput): Promise<PreviewResult> {
  if (audio.data.byteLength === 0 || audio.data.byteLength > MAX_AUDIO_BYTES || !audio.mimeType.startsWith("audio/")) {
    return { ok: false, error: "invalid_audio" };
  }
  const today = deps.clock.today();
  const result = await deps.interpreter.interpretAudio(audio, today);
  const draft = parseDraft(result?.draft);
  const transcript = result?.transcript?.trim();
  if (!draft || !transcript) return { ok: false, error: "not_understood" };
  return buildPreview(draft, transcript.slice(0, 500), today, "voice");
}

export async function correctPreview(deps: Deps, preview: Preview, correction: string): Promise<PreviewResult> {
  const previous = parsePreview(preview);
  if (!previous) return { ok: false, error: "invalid_preview" };

  const today = deps.clock.today();
  const draft = parseDraft(await deps.interpreter.correct(previous.draft, correction, today));
  return draft ? buildPreview(draft, previous.originalText, today, previous.source) : { ok: false, error: "not_understood" };
}

/** Valida a Prévia de novo no servidor e só então salva. Datas vêm dos campos, não do cliente. */
export async function confirmPreview(deps: ConfirmDeps, userId: string, preview: Preview): Promise<ConfirmResult> {
  const parsed = parsePreview(preview);
  if (!parsed) return { ok: false, error: "invalid_preview" };

  const today = deps.clock.today();
  const dates = resolveDates(parsed.draft, today);
  if (!dates) return { ok: false, error: "invalid_preview" };

  const { draft } = parsed;
  const rule: Omit<BillRule, "id"> = {
    title: draft.title,
    recurrence: draft.recurrence,
    day: draft.day,
    startDate: dates.startDate,
    tags: draft.tags,
    registeredOn: today,
    ...(draft.amount !== undefined && { amount: draft.amount }),
    ...(draft.month !== undefined && { month: draft.month }),
    ...(dates.endDate && { endDate: dates.endDate }),
  };
  const billId = await deps.repository.saveBill(userId, rule);
  // Depois de salva, a Conta vale mesmo que o Google falhe: os Lembretes ficam pendentes (ADR 0005).
  await createRemindersForBill(deps, userId, { ...rule, id: billId });
  return { ok: true, billId };
}

function buildPreview(draft: Draft, originalText: string, today: string, source?: "voice"): PreviewResult {
  const dates = resolveDates(draft, today);
  if (!dates) return { ok: false, error: "not_understood" };
  return { ok: true, preview: { ...draft, action: "create_bill", ...(source && { source }), originalText, ...dates } };
}

/** Primeira e última Data de vencimento; null quando o intervalo não faz sentido. */
function resolveDates(draft: Draft, today: string): { startDate: string; endDate?: string } | null {
  const { recurrence, day } = draft;
  // Mensal: um Vencimento por mês. Anual e avulsa: no mês da Conta, um por ano.
  const period = recurrence === "monthly" ? 1 : 12;
  const inBillMonth = (year: number) => `${year}-${pad(draft.month!)}`;

  let firstMonth: string;
  if (recurrence === "once" && draft.year) firstMonth = inBillMonth(draft.year);
  else if (recurrence !== "once" && draft.startMonth) {
    firstMonth = recurrence === "monthly" ? draft.startMonth : inBillMonth(yearOf(draft.startMonth));
  } else {
    // Próximo Vencimento a partir de hoje: o primeiro que ainda dá para pagar (Data efetiva hoje ou depois).
    // O do período anterior entra na disputa: dia 31 num sábado tem Data efetiva no dia 2 do mês seguinte.
    const anchor = recurrence === "monthly" ? monthOf(today) : inBillMonth(yearOf(today));
    firstMonth = [-1, 0, 1]
      .map((k) => shiftMonth(anchor, k * period))
      .find((month) => effectiveDate(dueDateIn(month, day)) >= today)!;
  }
  const startDate = dueDateIn(firstMonth, day);

  let endDate: string | undefined;
  if (recurrence === "once") endDate = startDate;
  else if (draft.endMonth) {
    // O último Vencimento que cabe até o mês final, inclusivo.
    const endYear = yearOf(draft.endMonth);
    const lastMonth =
      recurrence === "monthly"
        ? draft.endMonth
        : inBillMonth(monthNumberOf(draft.endMonth) >= draft.month! ? endYear : endYear - 1);
    endDate = dueDateIn(lastMonth, day);
  } else if (draft.installments) {
    endDate = dueDateIn(shiftMonth(firstMonth, (draft.installments - 1) * period), day);
  }

  if (endDate && endDate < startDate) return null;
  return endDate ? { startDate, endDate } : { startDate };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parsePreview(value: unknown): { draft: Draft; originalText: string; source?: "voice" } | null {
  if (!isRecord(value) || value.action !== "create_bill" || typeof value.originalText !== "string") return null;
  const draft = parseDraft(value);
  return draft ? { draft, originalText: value.originalText, ...(value.source === "voice" && { source: "voice" as const }) } : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isInt(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

/** Valida e normaliza a saída da IA ou uma Prévia vinda do cliente; descarta campos desconhecidos. */
function parseDraft(value: unknown): Draft | null {
  if (!isRecord(value)) return null;
  const { title, amount, recurrence, day, month, year, startMonth, installments, endMonth, tags } = value;

  if (typeof title !== "string" || !title.trim() || title.length > 120) return null;
  if (!RECURRENCES.includes(recurrence as never)) return null;
  if (!isInt(day, 1, 31)) return null;
  if (!Array.isArray(tags) || !tags.every((t) => TAGS.includes(t as never))) return null;
  const uniqueTags = [...new Set(tags as Tag[])];
  if (uniqueTags.length < 1 || uniqueTags.length > 3) return null;

  if (amount != null && !isValidAmount(amount)) return null;
  if (month != null && !isInt(month, 1, 12)) return null;
  if (recurrence !== "monthly" && month == null) return null;
  if (year != null && !isInt(year, 1900, 2200)) return null;
  if (startMonth != null && !(typeof startMonth === "string" && isMonth(startMonth))) return null;
  if (endMonth != null && !(typeof endMonth === "string" && isMonth(endMonth))) return null;
  if (installments != null && !isInt(installments, 1, 600)) return null;

  return {
    title: title.trim(),
    recurrence: recurrence as Draft["recurrence"],
    day,
    tags: uniqueTags,
    ...(amount != null && { amount: amount as number }),
    ...(month != null && { month: month as number }),
    ...(year != null && { year: year as number }),
    ...(startMonth != null && { startMonth: startMonth as string }),
    ...(installments != null && { installments: installments as number }),
    ...(endMonth != null && { endMonth: endMonth as string }),
  };
}

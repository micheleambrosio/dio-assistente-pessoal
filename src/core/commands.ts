import { shiftMonth, isMonth } from "@/lib/month";
import { dueDateIn } from "./business-calendar";
import { RECURRENCES, TAGS } from "./domain";
import type { BillRule, Draft, Occurrence, Preview, Tag } from "./domain";
import { occurrencesBetween } from "./occurrences";
import type { Clock, CommandInterpreter, Repository } from "./ports";

type Deps = { repository: Repository; interpreter: CommandInterpreter; clock: Clock };

export type PreviewResult =
  | { ok: true; preview: Preview }
  | { ok: false; error: "not_understood" | "invalid_preview" };

export type ConfirmResult = { ok: true; billId: string } | { ok: false; error: "invalid_preview" };

export type MonthView = { month: string; days: Record<string, Occurrence[]> };

export async function interpretCommand(deps: Deps, _userId: string, text: string): Promise<PreviewResult> {
  const draft = parseDraft(await deps.interpreter.interpret(text, deps.clock.today()));
  return draft ? buildPreview(draft, text, deps.clock.today()) : { ok: false, error: "not_understood" };
}

export async function correctPreview(
  deps: Deps,
  _userId: string,
  preview: Preview,
  correction: string,
): Promise<PreviewResult> {
  const previous = parsePreview(preview);
  if (!previous) return { ok: false, error: "invalid_preview" };

  const today = deps.clock.today();
  const draft = parseDraft(await deps.interpreter.correct(previous.draft, correction, today));
  return draft ? buildPreview(draft, previous.originalText, today) : { ok: false, error: "not_understood" };
}

/** Valida a Prévia de novo no servidor e só então salva. Datas vêm dos campos, não do cliente. */
export async function confirmPreview(deps: Deps, userId: string, preview: Preview): Promise<ConfirmResult> {
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
  return { ok: true, billId: await deps.repository.saveBill(userId, rule) };
}

/** Vencimentos cuja Data efetiva cai no mês, por dia. Um Vencimento de maio pode aparecer em junho. */
export async function getMonth(
  deps: Pick<Deps, "repository" | "clock">,
  userId: string,
  month: string,
): Promise<MonthView> {
  const today = deps.clock.today();
  const bills = await deps.repository.listBills(userId);
  const found = bills
    .flatMap((bill) => occurrencesBetween(bill, shiftMonth(month, -1), month, today))
    .filter((o) => o.effectiveDate.startsWith(month))
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate) || a.title.localeCompare(b.title, "pt-BR"));

  const days: Record<string, Occurrence[]> = {};
  for (const occurrence of found) (days[occurrence.effectiveDate] ??= []).push(occurrence);
  return { month, days };
}

function buildPreview(draft: Draft, originalText: string, today: string): PreviewResult {
  const dates = resolveDates(draft, today);
  if (!dates) return { ok: false, error: "not_understood" };
  return { ok: true, preview: { ...draft, action: "create_bill", originalText, ...dates } };
}

/** Primeira e última Data de vencimento; null quando o intervalo não faz sentido. */
function resolveDates(draft: Draft, today: string): { startDate: string; endDate?: string } | null {
  const { recurrence, day } = draft;
  const todayMonth = today.slice(0, 7);
  const todayYear = Number(today.slice(0, 4));

  let startDate: string;
  let endDate: string | undefined;

  if (recurrence === "once") {
    const mm = pad(draft.month!);
    const thisYear = dueDateIn(`${todayYear}-${mm}`, day);
    startDate = draft.year
      ? dueDateIn(`${draft.year}-${mm}`, day)
      : thisYear >= today ? thisYear : dueDateIn(`${todayYear + 1}-${mm}`, day);
    endDate = startDate;
  } else if (recurrence === "yearly") {
    const mm = pad(draft.month!);
    const startYear = draft.startMonth
      ? Number(draft.startMonth.slice(0, 4))
      : dueDateIn(`${todayYear}-${mm}`, day) >= today ? todayYear : todayYear + 1;
    startDate = dueDateIn(`${startYear}-${mm}`, day);
    if (draft.endMonth) {
      const endYear = Number(draft.endMonth.slice(0, 4));
      endDate = dueDateIn(`${Number(draft.endMonth.slice(5)) >= draft.month! ? endYear : endYear - 1}-${mm}`, day);
    } else if (draft.installments) {
      endDate = dueDateIn(`${startYear + draft.installments - 1}-${mm}`, day);
    }
  } else {
    const firstMonth = draft.startMonth ?? (dueDateIn(todayMonth, day) >= today ? todayMonth : shiftMonth(todayMonth, 1));
    startDate = dueDateIn(firstMonth, day);
    if (draft.endMonth) endDate = dueDateIn(draft.endMonth, day);
    else if (draft.installments) endDate = dueDateIn(shiftMonth(firstMonth, draft.installments - 1), day);
  }

  if (endDate && endDate < startDate) return null;
  return endDate ? { startDate, endDate } : { startDate };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parsePreview(value: unknown): { draft: Draft; originalText: string } | null {
  if (!isRecord(value) || value.action !== "create_bill" || typeof value.originalText !== "string") return null;
  const draft = parseDraft(value);
  return draft ? { draft, originalText: value.originalText } : null;
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

  if (amount != null && !(typeof amount === "number" && Number.isFinite(amount) && amount >= 0 && amount < 1e10)) return null;
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

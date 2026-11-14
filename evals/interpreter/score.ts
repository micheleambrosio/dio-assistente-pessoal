import type { Draft } from "@/core/domain";

export const FIELDS = ["title", "amount", "recurrence", "day", "month", "year", "startMonth", "installments", "endMonth", "tags"] as const;
export type Field = (typeof FIELDS)[number];

type Expected = {
  understood: true;
  /** Trecho que o título deve conter (sem acento nem caixa). */
  title?: string;
  amount?: number;
  recurrence?: Draft["recurrence"];
  day?: number;
  month?: number;
  year?: number;
  startMonth?: string;
  installments?: number;
  endMonth?: string;
  /** Etiquetas que precisam estar entre as escolhidas (a IA pode somar outras). */
  tags?: Draft["tags"];
  /** Campos que não podem vir preenchidos (ex.: `amount` quando o Valor não foi dito). */
  absent?: Field[];
};

export type EvalCase = {
  id: string;
  /** Agrupa o relatório: o que o Comando pede (mensal, anual, ambiguidade…). */
  intent: string;
  text: string;
  /** "Hoje" informado à IA; o padrão é `EVAL_TODAY`. */
  today?: string;
  /** Casos de correção: o que já tinha sido entendido, e `text` é a correção. */
  previous?: Draft;
  expect: Expected | { understood: false };
};

export type CaseScore = {
  id: string;
  intent: string;
  /** Resultado por campo avaliado; `understood` sempre entra. */
  fields: Record<string, boolean>;
  passed: boolean;
  got: Draft | null;
};

const plain = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function scoreCase(c: EvalCase, got: Draft | null): CaseScore {
  const fields: Record<string, boolean> = { understood: (got !== null) === c.expect.understood };

  if (c.expect.understood) {
    const { understood: _u, absent = [], ...wanted } = c.expect;
    for (const [field, value] of Object.entries(wanted) as [Field, never][]) {
      fields[field] = got !== null && matches(field, value, got);
    }
    for (const field of absent) fields[field] = got !== null && got[field] === undefined;
  }

  return { id: c.id, intent: c.intent, fields, passed: Object.values(fields).every(Boolean), got };
}

function matches(field: Field, want: unknown, got: Draft): boolean {
  const value = got[field];
  if (field === "title") return typeof value === "string" && plain(value).includes(plain(want as string));
  if (field === "tags") return (want as Draft["tags"]).every((t) => Array.isArray(value) && value.includes(t));
  if (field === "amount") return typeof value === "number" && Math.abs(value - (want as number)) < 0.005;
  return value === want;
}

type Rate = { passed: number; total: number };
export type Report = { passed: number; total: number; byIntent: Record<string, Rate>; byField: Record<string, Rate> };

export function aggregate(scores: CaseScore[]): Report {
  const byIntent: Record<string, Rate> = {};
  const byField: Record<string, Rate> = {};
  const bump = (table: Record<string, Rate>, key: string, ok: boolean) => {
    const rate = (table[key] ??= { passed: 0, total: 0 });
    rate.total++;
    if (ok) rate.passed++;
  };
  for (const s of scores) {
    bump(byIntent, s.intent, s.passed);
    for (const [field, ok] of Object.entries(s.fields)) bump(byField, field, ok);
  }
  return { passed: scores.filter((s) => s.passed).length, total: scores.length, byIntent, byField };
}

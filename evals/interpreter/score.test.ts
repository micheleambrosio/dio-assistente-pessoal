import { describe, expect, it } from "vitest";
import { aggregate, scoreCase } from "./score";
import type { EvalCase } from "./score";

const base = { id: "x", intent: "monthly", text: "t" } as const;
const draft = { title: "Internet Vivo", amount: 120, recurrence: "monthly", day: 15, tags: ["utilities", "subscriptions"] } as const;

describe("scoreCase", () => {
  const expected = { title: "internet", amount: 120, recurrence: "monthly", day: 15 } as const;
  const c: EvalCase = { ...base, expect: { understood: true, ...expected } };

  it("acerta cada campo esperado", () => {
    const s = scoreCase(c, { ...draft, tags: [...draft.tags] });
    expect(s.fields).toEqual({ understood: true, title: true, amount: true, recurrence: true, day: true });
    expect(s.passed).toBe(true);
  });

  it("o título compara sem acento e sem caixa, por trecho", () => {
    const s = scoreCase({ ...c, expect: { understood: true, title: "agua" } }, { ...draft, title: "Conta de ÁGUA", tags: ["utilities"] });
    expect(s.fields.title).toBe(true);
  });

  it("marca só o campo errado", () => {
    const s = scoreCase(c, { ...draft, day: 16, tags: ["utilities"] });
    expect(s.fields).toMatchObject({ understood: true, day: false, amount: true });
    expect(s.passed).toBe(false);
  });

  it("tags esperadas precisam estar todas presentes", () => {
    const withTags: EvalCase = { ...base, expect: { understood: true, tags: ["taxes"] } };
    expect(scoreCase(withTags, { ...draft, tags: ["taxes", "other"] }).fields.tags).toBe(true);
    expect(scoreCase(withTags, { ...draft, tags: ["other"] }).fields.tags).toBe(false);
  });

  it("`absent` exige que o campo não venha (Valor não inventado)", () => {
    const noAmount: EvalCase = { ...base, expect: { understood: true, absent: ["amount"] } };
    expect(scoreCase(noAmount, { ...draft, amount: undefined, tags: ["utilities"] }).fields.amount).toBe(true);
    expect(scoreCase(noAmount, { ...draft, tags: ["utilities"] }).fields.amount).toBe(false);
  });

  it("quando não entende o que devia, todos os campos esperados falham", () => {
    const s = scoreCase(c, null);
    expect(s.fields).toEqual({ understood: false, title: false, amount: false, recurrence: false, day: false });
  });

  it("quando devia não entender, só `understood` conta", () => {
    const refusal: EvalCase = { ...base, intent: "ambiguity", expect: { understood: false } };
    expect(scoreCase(refusal, null).passed).toBe(true);
    expect(scoreCase(refusal, { ...draft, tags: ["utilities"] }).passed).toBe(false);
  });
});

describe("aggregate", () => {
  it("taxa de acerto por intenção e por campo", () => {
    const monthly: EvalCase = { ...base, expect: { understood: true, day: 15, amount: 120 } };
    const refusal: EvalCase = { id: "r", intent: "ambiguity", text: "paguei a conta", expect: { understood: false } };
    const scores = [
      scoreCase(monthly, { ...draft, tags: ["utilities"] }),
      scoreCase(monthly, { ...draft, day: 1, tags: ["utilities"] }),
      scoreCase(refusal, null),
    ];
    const report = aggregate(scores);
    expect(report.byIntent).toEqual({ monthly: { passed: 1, total: 2 }, ambiguity: { passed: 1, total: 1 } });
    expect(report.byField.day).toEqual({ passed: 1, total: 2 });
    expect(report.byField.amount).toEqual({ passed: 2, total: 2 });
    expect(report.byField.understood).toEqual({ passed: 3, total: 3 });
    expect(report.passed).toBe(2);
    expect(report.total).toBe(3);
  });
});

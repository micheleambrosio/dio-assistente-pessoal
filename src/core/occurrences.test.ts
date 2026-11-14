import { describe, expect, it } from "vitest";
import type { BillRule } from "./domain";
import { occurrencesBetween } from "./occurrences";

function rule(overrides: Partial<BillRule>): BillRule {
  return {
    id: "bill-1",
    title: "Conta",
    recurrence: "monthly",
    day: 20,
    startDate: "2025-01-20",
    tags: ["utilities"],
    registeredOn: "2025-01-10",
    ...overrides,
  };
}

const TODAY = "2025-01-10";

describe("occurrencesBetween", () => {
  it("gera um Vencimento por mês numa Conta mensal, com Mês de referência e Data efetiva", () => {
    const result = occurrencesBetween(rule({}), "2025-01", "2025-03", TODAY);
    expect(result.map((o) => [o.referenceMonth, o.dueDate, o.effectiveDate])).toEqual([
      ["2025-01", "2025-01-20", "2025-01-20"],
      ["2025-02", "2025-02-20", "2025-02-20"],
      ["2025-03", "2025-03-20", "2025-03-20"],
    ]);
  });

  it("não gera Vencimentos antes da Data de início", () => {
    const result = occurrencesBetween(rule({ startDate: "2025-03-20" }), "2025-01", "2025-04", TODAY);
    expect(result.map((o) => o.referenceMonth)).toEqual(["2025-03", "2025-04"]);
  });

  it("vira o último dia do mês quando o dia não existe e mantém o dia nos outros meses", () => {
    const result = occurrencesBetween(rule({ day: 31, startDate: "2025-01-31" }), "2025-01", "2025-03", TODAY);
    expect(result.map((o) => o.dueDate)).toEqual(["2025-01-31", "2025-02-28", "2025-03-31"]);
  });

  it("mantém o Vencimento no Mês de referência quando a Data efetiva cruza o mês", () => {
    const [may] = occurrencesBetween(rule({ day: 31, startDate: "2025-05-31" }), "2025-05", "2025-05", TODAY);
    expect(may).toMatchObject({ referenceMonth: "2025-05", dueDate: "2025-05-31", effectiveDate: "2025-06-02" });
  });

  it("gera um Vencimento por ano numa Conta anual", () => {
    const yearly = rule({ recurrence: "yearly", day: 15, month: 8, startDate: "2025-08-15" });
    const result = occurrencesBetween(yearly, "2025-01", "2027-12", TODAY);
    expect(result.map((o) => o.dueDate)).toEqual(["2025-08-15", "2026-08-15", "2027-08-15"]);
  });

  it("leva a Conta anual de 29/02 para 28/02 nos anos não bissextos", () => {
    const yearly = rule({ recurrence: "yearly", day: 29, month: 2, startDate: "2024-02-29" });
    const result = occurrencesBetween(yearly, "2024-01", "2028-12", TODAY);
    expect(result.map((o) => o.dueDate)).toEqual([
      "2024-02-29",
      "2025-02-28",
      "2026-02-28",
      "2027-02-28",
      "2028-02-29",
    ]);
  });

  it("gera um único Vencimento numa Conta avulsa, por maior que seja o intervalo", () => {
    const once = rule({ recurrence: "once", day: 20, month: 3, startDate: "2025-03-20", endDate: "2025-03-20" });
    const result = occurrencesBetween(once, "2024-01", "2030-12", TODAY);
    expect(result.map((o) => o.dueDate)).toEqual(["2025-03-20"]);
  });

  it("trata a data final como inclusiva", () => {
    const result = occurrencesBetween(rule({ endDate: "2025-03-20" }), "2025-01", "2025-12", TODAY);
    expect(result.map((o) => o.referenceMonth)).toEqual(["2025-01", "2025-02", "2025-03"]);
  });

  it("não limita o horizonte de uma Conta fixa", () => {
    const result = occurrencesBetween(rule({}), "2040-05", "2040-05", TODAY);
    expect(result.map((o) => o.dueDate)).toEqual(["2040-05-20"]);
  });

  it("gera como Pagos os Vencimentos anteriores ao cadastro, e só eles", () => {
    const backfilled = rule({ startDate: "2024-11-20", registeredOn: "2025-01-10" });
    const result = occurrencesBetween(backfilled, "2024-11", "2025-02", TODAY);
    expect(result.map((o) => [o.referenceMonth, o.isPaid, o.isOverdue])).toEqual([
      ["2024-11", true, false],
      ["2024-12", true, false],
      ["2025-01", false, false],
      ["2025-02", false, false],
    ]);
  });

  it("marca como Atrasado o que não está Pago e tem Data efetiva no passado", () => {
    const [jan] = occurrencesBetween(rule({}), "2025-01", "2025-01", "2025-01-21");
    expect(jan.isOverdue).toBe(true);
    const [same] = occurrencesBetween(rule({}), "2025-01", "2025-01", "2025-01-20");
    expect(same.isOverdue).toBe(false);
  });

  it("carrega título, Etiquetas, Periodicidade e valor da Conta", () => {
    const [o] = occurrencesBetween(rule({ title: "Internet", amount: 120, tags: ["utilities", "subscriptions"] }), "2025-01", "2025-01", TODAY);
    expect(o).toMatchObject({ billId: "bill-1", title: "Internet", amount: 120, recurrence: "monthly", tags: ["utilities", "subscriptions"] });
  });
});

import { describe, expect, it } from "vitest";
import { dueDateIn, effectiveDate, holidays } from "./business-calendar";

describe("holidays", () => {
  it("inclui os feriados fixos da lei, inclusive 20/11 a partir de 2024", () => {
    const h = holidays(2025);
    for (const d of ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"]) {
      expect(h.has(`2025-${d}`)).toBe(true);
    }
    expect(holidays(2023).has("2023-11-20")).toBe(false);
  });

  it.each([
    // [ano, Sexta-feira Santa, Carnaval seg, Carnaval ter, Corpus Christi]
    [2024, "2024-03-29", "2024-02-12", "2024-02-13", "2024-05-30"],
    [2025, "2025-04-18", "2025-03-03", "2025-03-04", "2025-06-19"],
    [2026, "2026-04-03", "2026-02-16", "2026-02-17", "2026-06-04"],
    [2027, "2027-03-26", "2027-02-08", "2027-02-09", "2027-05-27"],
  ])("calcula as datas móveis de %i a partir da Páscoa", (_year, goodFriday, carnivalMon, carnivalTue, corpusChristi) => {
    const h = holidays(_year);
    for (const d of [goodFriday, carnivalMon, carnivalTue, corpusChristi]) expect(h.has(d)).toBe(true);
  });

  it("não conta feriados estaduais nem municipais", () => {
    expect(holidays(2025).has("2025-01-25")).toBe(false); // aniversário de São Paulo
    expect(holidays(2025).has("2025-07-09")).toBe(false); // Revolução Constitucionalista
  });
});

describe("effectiveDate", () => {
  it("mantém a data quando já é Dia útil", () => {
    expect(effectiveDate("2025-06-10")).toBe("2025-06-10");
  });

  it("avança o sábado e o domingo para a segunda", () => {
    expect(effectiveDate("2025-06-14")).toBe("2025-06-16");
    expect(effectiveDate("2025-06-15")).toBe("2025-06-16");
  });

  it("cruza o mês quando o próximo Dia útil está no mês seguinte", () => {
    expect(effectiveDate("2025-05-31")).toBe("2025-06-02");
  });

  it("avança Feriado para o próximo Dia útil", () => {
    expect(effectiveDate("2026-11-20")).toBe("2026-11-23");
    expect(effectiveDate("2026-02-16")).toBe("2026-02-18"); // segunda e terça de Carnaval
  });

  it("pula a sequência de feriado seguido de fim de semana", () => {
    expect(effectiveDate("2026-12-25")).toBe("2026-12-28");
    expect(effectiveDate("2025-12-31")).toBe("2025-12-31");
    expect(effectiveDate("2026-01-01")).toBe("2026-01-02");
  });

  it("cruza o ano", () => {
    expect(effectiveDate("2023-12-30")).toBe("2024-01-02"); // sáb → dom → 01/01 feriado → terça
  });
});

describe("dueDateIn", () => {
  it("usa o dia pedido quando ele existe", () => {
    expect(dueDateIn("2025-05", 15)).toBe("2025-05-15");
  });

  it("usa o último dia do mês quando o dia não existe", () => {
    expect(dueDateIn("2025-02", 31)).toBe("2025-02-28");
    expect(dueDateIn("2025-04", 31)).toBe("2025-04-30");
  });

  it("trata 29/02 em ano bissexto e não bissexto", () => {
    expect(dueDateIn("2024-02", 29)).toBe("2024-02-29");
    expect(dueDateIn("2025-02", 29)).toBe("2025-02-28");
  });
});

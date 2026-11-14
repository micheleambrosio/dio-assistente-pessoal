import { describe, expect, it } from "vitest";
import { SaoPauloClock } from "./clock";
import { FixedClock } from "./fakes/fixed-clock";

describe("SaoPauloClock", () => {
  it("usa o dia de São Paulo, não o de UTC (23h de 31/05 em SP já é 01/06 em UTC)", () => {
    const clock = new SaoPauloClock(() => new Date("2026-06-01T02:00:00Z"));
    expect(clock.today()).toBe("2026-05-31");
    expect(clock.currentMonth()).toBe("2026-05");
  });

  it("vira o mês quando passa da meia-noite em São Paulo", () => {
    const clock = new SaoPauloClock(() => new Date("2026-06-01T03:00:00Z"));
    expect(clock.today()).toBe("2026-06-01");
    expect(clock.currentMonth()).toBe("2026-06");
  });
});

describe("FixedClock", () => {
  it("congela o instante e também calcula em São Paulo", () => {
    const clock = new FixedClock(new Date("2026-01-01T01:00:00Z"));
    expect(clock.today()).toBe("2025-12-31");
    expect(clock.now().toISOString()).toBe("2026-01-01T01:00:00.000Z");
  });
});

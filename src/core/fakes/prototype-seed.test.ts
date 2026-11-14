import { describe, expect, it } from "vitest";
import { getMonth } from "../commands";
import { FixedClock } from "./fixed-clock";
import { InMemoryRepository } from "./in-memory-repository";
import { PROTOTYPE_NOW, PROTOTYPE_USER_ID, seedPrototype } from "./prototype-seed";

async function view(month: string) {
  const repository = new InMemoryRepository();
  await seedPrototype(repository);
  return getMonth(
    { repository, clock: new FixedClock(PROTOTYPE_NOW) },
    PROTOTYPE_USER_ID,
    month,
  );
}

describe("semente do protótipo (hoje = 12/06/2025)", () => {
  it("10/06 tem Água, Cartão, Academia e Netflix", async () => {
    const { days } = await view("2025-06");
    expect(days["2025-06-10"]!.map((o) => o.title)).toHaveLength(4);
    expect(days["2025-06-10"]!.map((o) => o.title)).toEqual(
      expect.arrayContaining(["Academia Smart Fit", "Água", "Cartão Nubank", "Netflix"]),
    );
  });

  it("a Energia de maio cai em 02/06, é Atrasada e é do Mês de referência maio", async () => {
    const { days, referenceOccurrences } = await view("2025-06");
    const energy = days["2025-06-02"]!.find((o) => o.title === "Energia")!;
    expect(energy).toMatchObject({ referenceMonth: "2025-05", isOverdue: true, amount: 187.4 });
    expect(referenceOccurrences.every((o) => o.referenceMonth === "2025-06")).toBe(true);
  });

  it("junho tem 2 Vencimentos sem valor (Energia e Água)", async () => {
    const { summary } = await view("2025-06");
    expect(summary.withoutAmountCount).toBe(2);
  });

  it("janeiro de 2025 está vazio, mas as Atrasadas continuam aparecendo", async () => {
    const { summary, overdue } = await view("2025-01");
    expect(summary.count).toBe(0);
    expect(overdue.map((o) => o.title)).toHaveLength(3);
    expect(overdue.map((o) => o.title)).toEqual(expect.arrayContaining(["Condomínio", "Energia", "Água"]));
  });
});

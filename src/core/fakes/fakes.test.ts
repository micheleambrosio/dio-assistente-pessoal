import { describe, expect, it } from "vitest";
import { InMemoryRepository } from "./in-memory-repository";
import { FakeCalendarGateway } from "./fake-calendar-gateway";

describe("InMemoryRepository", () => {
  it("devolve null para um Usuário sem agenda e o id depois de salvo", async () => {
    const repository = new InMemoryRepository();
    expect(await repository.getBillsCalendarId("u")).toBeNull();
    await repository.saveBillsCalendarId("u", "cal");
    expect(await repository.getBillsCalendarId("u")).toBe("cal");
  });
});

describe("FakeCalendarGateway", () => {
  it("devolve ids distintos a cada agenda criada", async () => {
    const gateway = new FakeCalendarGateway();
    const a = await gateway.createBillsCalendar("u", "x");
    const b = await gateway.createBillsCalendar("u", "x");
    expect(a).not.toBe(b);
  });
});

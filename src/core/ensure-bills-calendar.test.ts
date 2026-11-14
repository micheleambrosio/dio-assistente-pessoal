import { describe, expect, it } from "vitest";
import { ensureBillsCalendar } from "./ensure-bills-calendar";
import { InMemoryRepository } from "./fakes/in-memory-repository";
import { FakeCalendarGateway } from "./fakes/fake-calendar-gateway";

describe("ensureBillsCalendar", () => {
  it("no primeiro login cria a BillsCalendar e guarda o id", async () => {
    const repository = new InMemoryRepository();
    const calendar = new FakeCalendarGateway();

    const id = await ensureBillsCalendar({ repository, calendar }, "user-1");

    expect(calendar.created).toEqual([{ userId: "user-1", name: "Contas do mês" }]);
    expect(await repository.getBillsCalendarId("user-1")).toBe(id);
  });
});

describe("ensureBillsCalendar em logins seguintes", () => {
  it("devolve o id guardado e não cria uma segunda agenda", async () => {
    const repository = new InMemoryRepository();
    const calendar = new FakeCalendarGateway();
    const deps = { repository, calendar };

    const first = await ensureBillsCalendar(deps, "user-1");
    const second = await ensureBillsCalendar(deps, "user-1");

    expect(second).toBe(first);
    expect(calendar.created).toHaveLength(1);
  });

  it("cada Usuário tem a sua própria agenda", async () => {
    const deps = { repository: new InMemoryRepository(), calendar: new FakeCalendarGateway() };

    const a = await ensureBillsCalendar(deps, "user-1");
    const b = await ensureBillsCalendar(deps, "user-2");

    expect(a).not.toBe(b);
  });
});

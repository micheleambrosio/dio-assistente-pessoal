import { describe, expect, it } from "vitest";
import { ensureBillsCalendar } from "./ensure-bills-calendar";
import { InMemoryRepository } from "./fakes/in-memory-repository";
import { FakeCalendarGateway } from "./fakes/fake-calendar-gateway";
import { FixedClock } from "./fakes/fixed-clock";

const clock = new FixedClock(new Date("2025-01-10T12:00:00-03:00"));

describe("ensureBillsCalendar", () => {
  it("no primeiro login cria a BillsCalendar e guarda o id", async () => {
    const repository = new InMemoryRepository();
    const calendar = new FakeCalendarGateway();

    const id = await ensureBillsCalendar({ repository, calendar, clock }, "user-1");

    expect(calendar.created).toEqual([{ userId: "user-1", name: "Contas do mês" }]);
    expect(await repository.getBillsCalendarId("user-1")).toBe(id);
  });
});

describe("ensureBillsCalendar em logins seguintes", () => {
  it("devolve o id guardado e não cria uma segunda agenda", async () => {
    const repository = new InMemoryRepository();
    const calendar = new FakeCalendarGateway();
    const deps = { repository, calendar, clock };

    const first = await ensureBillsCalendar(deps, "user-1");
    const second = await ensureBillsCalendar(deps, "user-1");

    expect(second).toBe(first);
    expect(calendar.created).toHaveLength(1);
  });

  it("cada Usuário tem a sua própria agenda", async () => {
    const deps = { repository: new InMemoryRepository(), calendar: new FakeCalendarGateway(), clock };

    const a = await ensureBillsCalendar(deps, "user-1");
    const b = await ensureBillsCalendar(deps, "user-2");

    expect(a).not.toBe(b);
  });
});

describe("ensureBillsCalendar sob concorrência e falhas", () => {
  it("dois logins simultâneos terminam com uma única agenda no Google", async () => {
    const repository = new InMemoryRepository();
    const calendar = new FakeCalendarGateway();
    const deps = { repository, calendar, clock };

    const [a, b] = await Promise.all([
      ensureBillsCalendar(deps, "user-1"),
      ensureBillsCalendar(deps, "user-1"),
    ]);

    expect(a).toBe(b);
    expect(await repository.getBillsCalendarId("user-1")).toBe(a);
    expect(calendar.existingIds()).toEqual([a]);
  });

  it("se não conseguir guardar o id, apaga a agenda que acabou de criar e propaga o erro", async () => {
    class FailingRepository extends InMemoryRepository {
      async claimBillsCalendarId(): Promise<string> {
        throw new Error("banco fora do ar");
      }
    }
    const calendar = new FakeCalendarGateway();

    await expect(
      ensureBillsCalendar({ repository: new FailingRepository(), calendar, clock }, "user-1"),
    ).rejects.toThrow("banco fora do ar");
    expect(calendar.existingIds()).toEqual([]);
  });

  it("recria a agenda quando o Usuário a apagou no Google (ADR 0003)", async () => {
    const repository = new InMemoryRepository();
    const calendar = new FakeCalendarGateway();
    const deps = { repository, calendar, clock };

    const first = await ensureBillsCalendar(deps, "user-1");
    calendar.deleteExternally(first);
    const second = await ensureBillsCalendar(deps, "user-1");

    expect(second).not.toBe(first);
    expect(await repository.getBillsCalendarId("user-1")).toBe(second);
    expect(calendar.existingIds()).toEqual([second]);
  });
});

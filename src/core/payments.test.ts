import { describe, expect, it } from "vitest";
import { confirmPreview, interpretCommand } from "./commands";
import { getMonth } from "./month-view";
import type { Draft } from "./domain";
import { GoogleAuthError } from "./ports";
import { FakeCalendarGateway } from "./fakes/fake-calendar-gateway";
import { FakeCommandInterpreter } from "./fakes/fake-command-interpreter";
import { FixedClock } from "./fakes/fixed-clock";
import { InMemoryRepository } from "./fakes/in-memory-repository";
import { togglePaid } from "./payments";
import { syncReminders } from "./reminders";

const USER = "user-1";

function setup(today = "2025-01-10") {
  const repository = new InMemoryRepository();
  const calendar = new FakeCalendarGateway();
  const clock = new FixedClock(new Date(`${today}T12:00:00-03:00`));
  const deps = { repository, calendar, clock, appUrl: "https://contas.example.com", interpreter: new FakeCommandInterpreter(null, null) };
  return { deps, repository, calendar };
}

const monthly: Draft = { title: "Internet Vivo", amount: 120, recurrence: "monthly", day: 15, tags: ["utilities"] };

async function register(deps: ReturnType<typeof setup>["deps"], draft: Draft) {
  const interpreter = new FakeCommandInterpreter(draft, null);
  const result = await interpretCommand({ ...deps, interpreter }, "comando");
  if (!result.ok) throw new Error("esperava uma Prévia");
  const confirmed = await confirmPreview(deps, USER, result.preview);
  if (!confirmed.ok) throw new Error("esperava confirmar");
  return confirmed.billId;
}

async function dayOf(deps: ReturnType<typeof setup>["deps"], month: string, date: string) {
  return (await getMonth(deps, USER, month)).days[date] ?? [];
}

describe("togglePaid", () => {
  it("marca o Vencimento como Pago e o desmarca", async () => {
    const { deps } = setup("2025-01-10");
    const billId = await register(deps, monthly);

    expect(await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: true })).toEqual({ ok: true });
    expect((await dayOf(deps, "2025-01", "2025-01-15"))[0]).toMatchObject({ isPaid: true, isOverdue: false });

    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: false });
    expect((await dayOf(deps, "2025-01", "2025-01-15"))[0]).toMatchObject({ isPaid: false });
  });

  it("o valor pago vira o Valor do Vencimento, e só dele", async () => {
    const { deps } = setup("2025-01-10");
    const billId = await register(deps, monthly);

    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: true, amount: 131.5 });

    expect((await dayOf(deps, "2025-01", "2025-01-15"))[0].amount).toBe(131.5);
    expect((await dayOf(deps, "2025-02", "2025-02-17"))[0].amount).toBe(120);
  });

  it("editar só o valor não muda o status do Vencimento", async () => {
    const { deps } = setup("2025-01-10");
    const billId = await register(deps, monthly);

    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: false, amount: 150 });
    expect((await dayOf(deps, "2025-01", "2025-01-15"))[0]).toMatchObject({ isPaid: false, amount: 150 });

    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: true });
    expect((await dayOf(deps, "2025-01", "2025-01-15"))[0]).toMatchObject({ isPaid: true, amount: 150 });
  });

  it("dá um valor a um Vencimento que não tinha", async () => {
    const { deps } = setup("2025-01-10");
    const billId = await register(deps, { ...monthly, amount: undefined });

    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: true, amount: 99 });

    expect((await dayOf(deps, "2025-01", "2025-01-15"))[0].amount).toBe(99);
  });

  it("recusa valor inválido e Vencimento que não existe", async () => {
    const { deps } = setup("2025-01-10");
    const billId = await register(deps, monthly);

    expect(await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: true, amount: -5 })).toEqual({ ok: false, error: "invalid_amount" });
    expect(await togglePaid(deps, USER, { billId: "nope", referenceMonth: "2025-01", isPaid: true })).toEqual({ ok: false, error: "not_found" });
    expect(await togglePaid(deps, USER, { billId, referenceMonth: "2024-12", isPaid: true })).toEqual({ ok: false, error: "not_found" });
  });

  it("desmarca um Vencimento que já nasceu Pago (anterior ao cadastro)", async () => {
    const { deps } = setup("2025-03-10");
    const billId = await register(deps, { ...monthly, startMonth: "2025-01" });
    expect((await dayOf(deps, "2025-01", "2025-01-15"))[0].isPaid).toBe(true);

    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: false });

    expect((await dayOf(deps, "2025-01", "2025-01-15"))[0]).toMatchObject({ isPaid: false, isOverdue: true });
  });
});

describe("togglePaid e o Lembrete", () => {
  it("Pago põe ✅ no título e tira a notificação; desmarcar restaura os dois", async () => {
    const { deps, calendar } = setup("2025-01-10");
    const billId = await register(deps, monthly);

    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: true });
    expect(calendar.events()[0].event).toMatchObject({ summary: "✅ Internet Vivo: R$ 120,00", popupMinutesBefore: null });

    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: false });
    expect(calendar.events()[0].event).toMatchObject({ summary: "Internet Vivo: R$ 120,00", popupMinutesBefore: 0 });
  });

  it("o valor pago vai para o título do Lembrete", async () => {
    const { deps, calendar } = setup("2025-01-10");
    const billId = await register(deps, monthly);

    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: true, amount: 131.5 });

    expect(calendar.events()[0].event.summary).toBe("✅ Internet Vivo: R$ 131,50");
  });

  it("só mexe no Lembrete do Vencimento marcado", async () => {
    const { deps, calendar } = setup("2025-01-10");
    const billId = await register(deps, monthly);

    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: true });

    const [, february] = calendar.events();
    expect(february.event).toMatchObject({ summary: "Internet Vivo: R$ 120,00", popupMinutesBefore: 0 });
  });

  it("desmarcar depois da Data efetiva restaura o título, mas não a notificação", async () => {
    const { deps, repository, calendar } = setup("2025-01-10");
    const billId = await register(deps, monthly);
    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: true });

    const later = { ...deps, clock: new FixedClock(new Date("2025-01-20T12:00:00-03:00")) };
    await togglePaid(later, USER, { billId, referenceMonth: "2025-01", isPaid: false });

    expect(calendar.events()[0].event).toMatchObject({ summary: "Internet Vivo: R$ 120,00", popupMinutesBefore: null });
    expect((await repository.listReminders(USER))[0].syncStatus).toBe("synced");
  });

  it("se o Google falha, o Pago vale e o Lembrete fica pendente com o motivo", async () => {
    const { deps, repository, calendar } = setup("2025-01-10");
    const billId = await register(deps, monthly);
    calendar.failWith(new Error("Google fora do ar"));

    const result = await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: true });

    expect(result).toEqual({ ok: true });
    expect((await dayOf(deps, "2025-01", "2025-01-15"))[0].isPaid).toBe(true);
    const [first] = await repository.listReminders(USER);
    expect(first).toMatchObject({ isPaid: true, syncStatus: "pending_update", lastError: "Google fora do ar" });
  });

  it("se o Google falha ao desmarcar, o Lembrete fica pendente e volta ao normal depois", async () => {
    const { deps, repository, calendar } = setup("2025-01-10");
    const billId = await register(deps, monthly);
    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: true });
    calendar.failWith(new Error("fora do ar"));

    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: false });

    expect((await repository.listReminders(USER))[0]).toMatchObject({ isPaid: false, syncStatus: "pending_update" });
    calendar.failWith(null);
    await syncReminders(deps, USER);
    expect(calendar.events()[0].event.summary).toBe("Internet Vivo: R$ 120,00");
  });

  it("não congela o valor da regra quando nenhum valor foi informado", async () => {
    const { deps, repository } = setup("2025-01-10");
    const billId = await register(deps, monthly);

    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: true });

    expect((await repository.listOccurrenceStates(USER))[0].amount).toBeUndefined();
  });

  it("a pendência é retomada na próxima abertura do app", async () => {
    const { deps, calendar } = setup("2025-01-10");
    const billId = await register(deps, monthly);
    calendar.failWith(new GoogleAuthError());
    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: true });
    calendar.failWith(null);
    await deps.repository.setAccessRevoked(USER, false);

    await syncReminders(deps, USER);

    expect(calendar.events()[0].event.summary).toBe("✅ Internet Vivo: R$ 120,00");
  });

  it("um Lembrete que ainda nem foi criado no Google nasce já Pago", async () => {
    const { deps, calendar } = setup("2025-01-10");
    calendar.failWith(new Error("fora do ar"));
    const billId = await register(deps, monthly);
    await togglePaid(deps, USER, { billId, referenceMonth: "2025-01", isPaid: true });
    calendar.failWith(null);

    await syncReminders(deps, USER);

    expect(calendar.events().map((e) => e.event.summary)[0]).toBe("✅ Internet Vivo: R$ 120,00");
  });

  it("um Vencimento sem Lembrete (fora da Janela) vira Pago sem tocar no Google", async () => {
    const { deps, calendar } = setup("2025-01-10");
    const billId = await register(deps, monthly);
    const before = calendar.events().length;

    expect(await togglePaid(deps, USER, { billId, referenceMonth: "2026-06", isPaid: true })).toEqual({ ok: true });
    expect(calendar.events()).toHaveLength(before);
  });
});

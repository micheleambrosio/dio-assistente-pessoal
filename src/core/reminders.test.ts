import { describe, expect, it } from "vitest";
import { confirmPreview, interpretCommand } from "./commands";
import type { Draft } from "./domain";
import { FakeCalendarGateway } from "./fakes/fake-calendar-gateway";
import { FakeCommandInterpreter } from "./fakes/fake-command-interpreter";
import { FixedClock } from "./fakes/fixed-clock";
import { InMemoryRepository } from "./fakes/in-memory-repository";
import { reconnectGoogle, syncOnAppOpen } from "./reminders";
import { GoogleAuthError } from "./ports";

const USER = "user-1";
const APP_URL = "https://contas.example.com";

function setup(today = "2025-01-10") {
  const repository = new InMemoryRepository();
  const calendar = new FakeCalendarGateway();
  const clock = new FixedClock(new Date(`${today}T12:00:00-03:00`));
  const deps = { repository, calendar, clock, appUrl: APP_URL, interpreter: new FakeCommandInterpreter(null, null) };
  return { deps, repository, calendar };
}

const monthly: Draft = { title: "Internet Vivo", amount: 120, recurrence: "monthly", day: 15, tags: ["utilities"] };

async function register(deps: ReturnType<typeof setup>["deps"], draft: Draft) {
  const interpreter = new FakeCommandInterpreter(draft, null);
  const result = await interpretCommand({ ...deps, interpreter }, USER, "comando");
  if (!result.ok) throw new Error("esperava uma Prévia");
  const confirmed = await confirmPreview(deps, USER, result.preview);
  if (!confirmed.ok) throw new Error("esperava confirmar");
  return confirmed.billId;
}

describe("confirmPreview cria os Lembretes", () => {
  it("cria um evento das 9h às 9h15 na Data efetiva, com pop-up às 9h, título com valor, Etiquetas e link", async () => {
    const { deps, calendar } = setup("2025-01-10");

    await register(deps, monthly);

    const [first] = calendar.events();
    expect(first.event).toEqual({
      summary: "Internet Vivo: R$ 120,00",
      description: "Etiquetas: Utilidades\nhttps://contas.example.com",
      start: "2025-01-15T09:00:00",
      end: "2025-01-15T09:15:00",
      timeZone: "America/Sao_Paulo",
      popupMinutesBefore: 0,
    });
  });

  it("usa só o título quando a Conta não tem valor", async () => {
    const { deps, calendar } = setup();
    await register(deps, { ...monthly, amount: undefined });
    expect(calendar.events()[0].event.summary).toBe("Internet Vivo");
  });

  it("lista todas as Etiquetas na descrição", async () => {
    const { deps, calendar } = setup();
    await register(deps, { ...monthly, tags: ["housing", "taxes"] });
    expect(calendar.events()[0].event.description).toBe("Etiquetas: Moradia, Impostos\nhttps://contas.example.com");
  });

  it("cria os Lembretes na Data efetiva, não na Data de vencimento", async () => {
    const { deps, calendar } = setup("2025-05-01");
    await register(deps, { ...monthly, day: 31, amount: undefined }); // 31/05/2025 é sábado
    expect(calendar.events()[0].event.start).toBe("2025-06-02T09:00:00");
  });

  it("uma Conta mensal ganha Lembretes para os próximos 12 Vencimentos", async () => {
    const { deps, calendar } = setup("2025-01-10");
    await register(deps, monthly);
    const days = calendar.events().map((e) => e.event.start.slice(0, 7));
    expect(days).toHaveLength(12);
    expect(days[0]).toBe("2025-01");
    expect(days[11]).toBe("2025-12");
  });

  it("uma Conta avulsa ganha 1 Lembrete", async () => {
    const { deps, calendar } = setup("2025-01-10");
    await register(deps, { title: "IPVA", recurrence: "once", day: 20, month: 3, tags: ["taxes"] });
    expect(calendar.events().map((e) => e.event.start.slice(0, 10))).toEqual(["2025-03-20"]);
  });

  it("uma Conta anual ganha 12 Lembretes, um por ano", async () => {
    const { deps, calendar } = setup("2025-01-10");
    await register(deps, { title: "Seguro", recurrence: "yearly", day: 20, month: 3, tags: ["insurance"] });
    const years = calendar.events().map((e) => e.event.start.slice(0, 4));
    expect(years).toEqual(Array.from({ length: 12 }, (_, i) => String(2025 + i)));
  });

  it("uma Conta com data final só ganha Lembretes até ela", async () => {
    const { deps, calendar } = setup("2025-01-10");
    await register(deps, { ...monthly, installments: 3 });
    expect(calendar.events()).toHaveLength(3);
  });

  it("Vencimentos anteriores ao cadastro nunca recebem Lembrete", async () => {
    const { deps, calendar } = setup("2025-03-10");
    await register(deps, { ...monthly, startMonth: "2025-01" }); // jan e fev já passaram
    const months = calendar.events().map((e) => e.event.start.slice(0, 7));
    expect(months[0]).toBe("2025-03");
    expect(months).toHaveLength(12);
  });
});

describe("quando o Google falha", () => {
  it("a Conta é salva e os Lembretes ficam pending_create com o last_error", async () => {
    const { deps, repository, calendar } = setup();
    calendar.failWith(new Error("Google fora do ar"));

    const billId = await register(deps, { ...monthly, installments: 2 });

    expect(await repository.listBills(USER)).toHaveLength(1);
    const reminders = await repository.listReminders(USER);
    expect(reminders.map((r) => [r.billId, r.syncStatus, r.lastError])).toEqual([
      [billId, "pending_create", "Google fora do ar"],
      [billId, "pending_create", "Google fora do ar"],
    ]);
  });

  it("a falha de um Lembrete não impede os outros; só ele fica pendente", async () => {
    const { deps, repository, calendar } = setup();
    let calls = 0;
    const original = calendar.createReminder.bind(calendar);
    calendar.createReminder = async (...args) => {
      if (++calls === 2) throw new Error("instável");
      return original(...args);
    };

    await register(deps, { ...monthly, installments: 3 });

    const statuses = (await repository.listReminders(USER)).map((r) => r.syncStatus);
    expect(statuses).toEqual(["synced", "pending_create", "synced"]);
    expect(calendar.events()).toHaveLength(2);
  });
});

describe("syncOnAppOpen: Lembretes pendentes", () => {
  it("tenta de novo os pendentes e os sincroniza quando o Google volta", async () => {
    const { deps, repository, calendar } = setup();
    calendar.failWith(new Error("Google fora do ar"));
    await register(deps, { ...monthly, installments: 2 });
    calendar.failWith(null);

    const status = await syncOnAppOpen(deps, USER);

    expect(status).toEqual({ pendingCount: 0, accessRevoked: false });
    expect(calendar.events()).toHaveLength(2);
    const reminders = await repository.listReminders(USER);
    expect(reminders.map((r) => [r.syncStatus, r.lastError])).toEqual([["synced", undefined], ["synced", undefined]]);
  });

  it("informa quantos continuam pendentes enquanto o Google não responde", async () => {
    const { deps, calendar } = setup();
    calendar.failWith(new Error("Google fora do ar"));
    await register(deps, { ...monthly, installments: 2 });

    expect(await syncOnAppOpen(deps, USER)).toEqual({ pendingCount: 2, accessRevoked: false });
  });

  it("não duplica eventos de Lembretes já sincronizados", async () => {
    const { deps, calendar } = setup();
    await register(deps, { ...monthly, installments: 2 });

    await syncOnAppOpen(deps, USER);
    await syncOnAppOpen(deps, USER);

    expect(calendar.events()).toHaveLength(2);
  });

  it("repete a operação certa de cada pendência: criar, alterar e apagar", async () => {
    const { deps, repository, calendar } = setup();
    await register(deps, { ...monthly, installments: 3 });
    const [a, b, c] = await repository.listReminders(USER);
    await repository.updateReminder(USER, a.id, { syncStatus: "pending_update" });
    await repository.updateReminder(USER, b.id, { syncStatus: "pending_delete" });
    await repository.updateReminder(USER, c.id, { syncStatus: "pending_create", googleEventId: undefined });
    await calendar.deleteReminder(USER, "x", c.googleEventId!);

    await syncOnAppOpen(deps, USER);

    const left = await repository.listReminders(USER);
    expect(left.map((r) => r.id)).toEqual([a.id, c.id]);
    expect(left.every((r) => r.syncStatus === "synced")).toBe(true);
    expect(calendar.events().map((e) => e.id).sort()).toEqual(left.map((r) => r.googleEventId!).sort());
  });
});

describe("acesso revogado", () => {
  it("um erro de autenticação marca access_revoked, mantém os pendentes e para de insistir", async () => {
    const { deps, repository, calendar } = setup();
    calendar.failWith(new GoogleAuthError());

    await register(deps, { ...monthly, installments: 3 });

    expect(await repository.isAccessRevoked(USER)).toBe(true);
    const reminders = await repository.listReminders(USER);
    expect(reminders.map((r) => r.syncStatus)).toEqual(["pending_create", "pending_create", "pending_create"]);
    expect(await syncOnAppOpen(deps, USER)).toEqual({ pendingCount: 3, accessRevoked: true });
  });

  it("não chama o Google enquanto o acesso estiver revogado", async () => {
    const { deps, calendar } = setup();
    calendar.failWith(new GoogleAuthError());
    await register(deps, { ...monthly, installments: 2 });
    calendar.failWith(null);

    await syncOnAppOpen(deps, USER);

    expect(calendar.events()).toEqual([]);
  });

  it("depois de reconectar, as pendências são sincronizadas", async () => {
    const { deps, repository, calendar } = setup();
    calendar.failWith(new GoogleAuthError());
    await register(deps, { ...monthly, installments: 2 });
    calendar.failWith(null);

    const status = await reconnectGoogle(deps, USER);

    expect(status).toEqual({ pendingCount: 0, accessRevoked: false });
    expect(await repository.isAccessRevoked(USER)).toBe(false);
    expect(calendar.events()).toHaveLength(2);
  });
});

describe("syncOnAppOpen: Janela de lembretes", () => {
  const later = (today: string) => ({ clock: new FixedClock(new Date(`${today}T12:00:00-03:00`)) });
  const months = (calendar: FakeCalendarGateway) => calendar.events().map((e) => e.event.start.slice(0, 7)).sort();

  it("estende a Janela com os próximos 12 quando hoje está no mês do último Lembrete", async () => {
    const { deps, calendar } = setup("2025-01-10");
    await register(deps, monthly); // Lembretes de 2025-01 a 2025-12

    await syncOnAppOpen({ ...deps, ...later("2025-12-05") }, USER);

    const all = months(calendar);
    expect(all).toHaveLength(24);
    expect(all[12]).toBe("2026-01");
    expect(all[23]).toBe("2026-12");
  });

  it("não estende enquanto o último Lembrete ainda está em um mês futuro", async () => {
    const { deps, calendar } = setup("2025-01-10");
    await register(deps, monthly);

    await syncOnAppOpen({ ...deps, ...later("2025-11-30") }, USER);

    expect(calendar.events()).toHaveLength(12);
  });

  it("estende também depois de meses sem abrir o app, a partir dos próximos Vencimentos", async () => {
    const { deps, calendar } = setup("2025-01-10");
    await register(deps, monthly);

    await syncOnAppOpen({ ...deps, ...later("2026-04-01") }, USER);

    const all = months(calendar);
    expect(all).toHaveLength(24);
    expect(all[12]).toBe("2026-04");
    expect(all[23]).toBe("2027-03");
  });

  it("é idempotente: abrir o app duas vezes seguidas não cria Lembretes repetidos", async () => {
    const { deps, calendar } = setup("2025-01-10");
    await register(deps, monthly);
    const open = { ...deps, ...later("2025-12-05") };

    await syncOnAppOpen(open, USER);
    await syncOnAppOpen(open, USER);

    expect(calendar.events()).toHaveLength(24);
  });

  it("uma Conta salva sem Lembretes (a criação falhou) ganha a Janela ao abrir o app", async () => {
    const { deps, repository, calendar } = setup("2025-01-10");
    await repository.saveBill(USER, {
      title: "Luz", recurrence: "monthly", day: 15, startDate: "2025-01-15", tags: ["utilities"], registeredOn: "2025-01-10",
    });

    await syncOnAppOpen(deps, USER);

    expect(calendar.events()).toHaveLength(12);
  });

  it("uma Conta encerrada não ganha Lembretes novos ao estender", async () => {
    const { deps, calendar } = setup("2025-01-10");
    await register(deps, { ...monthly, installments: 2 });

    await syncOnAppOpen({ ...deps, ...later("2025-06-01") }, USER);

    expect(calendar.events()).toHaveLength(2);
  });
});

describe("syncOnAppOpen: Agenda de contas apagada", () => {
  it("recria a agenda e todos os Lembretes da Janela atual", async () => {
    const { deps, repository, calendar } = setup("2025-01-10");
    await register(deps, { ...monthly, installments: 3 });
    const [calendarId] = calendar.existingIds();
    calendar.deleteExternally(calendarId);
    expect(calendar.events()).toEqual([]);

    const status = await syncOnAppOpen(deps, USER);

    expect(status.pendingCount).toBe(0);
    expect(calendar.existingIds()).toHaveLength(1);
    expect(calendar.existingIds()[0]).not.toBe(calendarId);
    expect(calendar.events().map((e) => e.calendarId)).toEqual(Array(3).fill(calendar.existingIds()[0]));
    expect(await repository.getBillsCalendarId(USER)).toBe(calendar.existingIds()[0]);
  });
});

describe("Agenda de contas apagada: só a Janela atual", () => {
  it("não recria no Calendar os Lembretes de datas que já passaram", async () => {
    const { deps, calendar } = setup("2025-01-10");
    await register(deps, { ...monthly, installments: 3 }); // 15/01, 15/02, 17/03 (15/03 é sábado)
    calendar.deleteExternally(calendar.existingIds()[0]);

    await syncOnAppOpen({ ...deps, clock: new FixedClock(new Date("2025-02-20T12:00:00-03:00")) }, USER);

    expect(calendar.events().map((e) => e.event.start.slice(0, 10))).toEqual(["2025-03-17"]);
  });
});

describe("sincronização de mão única", () => {
  it("o app nunca lê o Calendar: um evento apagado à mão no Google não vira pendência", async () => {
    const { deps, calendar } = setup("2025-01-10");
    await register(deps, { ...monthly, installments: 2 });
    await calendar.deleteReminder(USER, "x", calendar.events()[0].id);

    const status = await syncOnAppOpen(deps, USER);

    expect(status.pendingCount).toBe(0);
    expect(calendar.events()).toHaveLength(1);
  });
});

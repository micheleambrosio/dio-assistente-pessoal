import { describe, expect, it } from "vitest";
import { confirmPreview, correctPreview, interpretCommand } from "./commands";
import { getMonth } from "./month-view";
import type { Draft, Preview } from "./domain";
import { FakeCalendarGateway } from "./fakes/fake-calendar-gateway";
import { FakeCommandInterpreter } from "./fakes/fake-command-interpreter";
import { FixedClock } from "./fakes/fixed-clock";
import { InMemoryRepository } from "./fakes/in-memory-repository";

const USER = "user-1";

function setup(today = "2025-01-10", interpretResult: Draft | null = null, correctResult: Draft | null = null) {
  const repository = new InMemoryRepository();
  const interpreter = new FakeCommandInterpreter(interpretResult, correctResult);
  const clock = new FixedClock(new Date(`${today}T12:00:00-03:00`));
  return { deps: { repository, interpreter, clock, calendar: new FakeCalendarGateway(), appUrl: "https://contas.example.com" }, repository, interpreter };
}

const monthly: Draft = { title: "Internet Vivo", amount: 120, recurrence: "monthly", day: 15, tags: ["utilities"] };

async function previewOf(draft: Draft, today = "2025-01-10", text = "comando") {
  const { deps } = setup(today, draft);
  const result = await interpretCommand(deps, text);
  if (!result.ok) throw new Error("esperava uma Prévia");
  return result.preview;
}

describe("interpretCommand", () => {
  it("devolve uma Prévia com o texto, os campos e as Etiquetas, sem persistir nada", async () => {
    const { deps, repository } = setup("2025-01-10", monthly);
    const result = await interpretCommand(deps, "internet Vivo, 120, todo dia 15");
    expect(result).toEqual({
      ok: true,
      preview: { ...monthly, action: "create_bill", originalText: "internet Vivo, 120, todo dia 15", startDate: "2025-01-15" },
    });
    expect(await repository.listBills(USER)).toEqual([]);
  });

  it("repassa a data de hoje (America/Sao_Paulo) à IA", async () => {
    const { deps, interpreter } = setup("2025-01-10", monthly);
    await interpretCommand(deps, "x");
    expect(interpreter.interpretCalls).toEqual([{ text: "x", today: "2025-01-10" }]);
  });

  it("devolve not_understood quando a IA não entende o Comando", async () => {
    const { deps } = setup("2025-01-10", null);
    expect(await interpretCommand(deps, "bom dia")).toEqual({ ok: false, error: "not_understood" });
  });

  it.each([
    ["sem título", { ...monthly, title: "  " }],
    ["dia 32", { ...monthly, day: 32 }],
    ["sem Etiquetas", { ...monthly, tags: [] }],
    ["mais de 3 Etiquetas", { ...monthly, tags: ["housing", "utilities", "taxes", "other"] }],
    ["Etiqueta fora do enum", { ...monthly, tags: ["comida"] }],
    ["Periodicidade inválida", { ...monthly, recurrence: "weekly" }],
    ["anual sem mês", { ...monthly, recurrence: "yearly" }],
    ["valor negativo", { ...monthly, amount: -1 }],
    ["valor acima do que o banco comporta", { ...monthly, amount: 1e12 }],
    ["dia 0", { ...monthly, day: 0 }],
    ["mês fora da faixa", { ...monthly, recurrence: "yearly", month: 13 }],
  ] as [string, unknown][])("devolve not_understood para uma resposta inválida da IA (%s)", async (_name, draft) => {
    const { deps } = setup("2025-01-10", draft as Draft);
    expect(await interpretCommand(deps, "x")).toEqual({ ok: false, error: "not_understood" });
  });

  it("por padrão, a Data de início é o próximo Vencimento a partir de hoje", async () => {
    expect((await previewOf({ ...monthly, day: 20 }, "2025-01-10")).startDate).toBe("2025-01-20");
    expect((await previewOf({ ...monthly, day: 20 }, "2025-01-20")).startDate).toBe("2025-01-20");
    expect((await previewOf({ ...monthly, day: 20 }, "2025-01-25")).startDate).toBe("2025-02-20");
  });

  it("'todo dia 20' vira mensal e, sem data final, é uma Conta fixa", async () => {
    const preview = await previewOf({ ...monthly, day: 20 });
    expect(preview.recurrence).toBe("monthly");
    expect(preview.endDate).toBeUndefined();
  });

  it("'todo 15 de agosto' vira anual, no próximo 15/08", async () => {
    const preview = await previewOf({ title: "Seguro do carro", recurrence: "yearly", day: 15, month: 8, tags: ["insurance"] }, "2025-09-01");
    expect(preview).toMatchObject({ recurrence: "yearly", startDate: "2026-08-15" });
    expect(preview.endDate).toBeUndefined();
  });

  it("'20 de março' vira avulsa, com um único Vencimento", async () => {
    const preview = await previewOf({ title: "IPVA", amount: 1800, recurrence: "once", day: 20, month: 3, tags: ["taxes"] });
    expect(preview).toMatchObject({ recurrence: "once", startDate: "2025-03-20", endDate: "2025-03-20" });
  });

  it("uma Conta avulsa de uma data que já passou neste ano vai para o ano seguinte, a não ser que o ano seja dito", async () => {
    const once: Draft = { title: "IPVA", recurrence: "once", day: 20, month: 3, tags: ["taxes"] };
    expect((await previewOf(once, "2025-05-01")).startDate).toBe("2026-03-20");
    expect((await previewOf({ ...once, year: 2025 }, "2025-05-01")).startDate).toBe("2025-03-20");
  });

  it("'10x a partir de abril' termina em janeiro (data final inclusiva)", async () => {
    const preview = await previewOf({ ...monthly, day: 20, startMonth: "2025-04", installments: 10 });
    expect(preview).toMatchObject({ startDate: "2025-04-20", endDate: "2026-01-20" });
  });

  it("'até dezembro' inclui o Vencimento de dezembro", async () => {
    const preview = await previewOf({ ...monthly, day: 20, endMonth: "2025-12" });
    expect(preview.endDate).toBe("2025-12-20");
  });

  it("uma Data de início no passado vira a primeira Data de vencimento", async () => {
    const preview = await previewOf({ ...monthly, day: 10, startMonth: "2024-08" });
    expect(preview.startDate).toBe("2024-08-10");
  });

  it("devolve not_understood quando a data final fica antes da Data de início", async () => {
    const { deps } = setup("2025-01-10", { ...monthly, startMonth: "2025-06", endMonth: "2025-03" });
    expect(await interpretCommand(deps, "x")).toEqual({ ok: false, error: "not_understood" });
  });
});

describe("correctPreview", () => {
  it("devolve a Prévia atualizada pela correção, sem persistir nada", async () => {
    const { deps, repository, interpreter } = setup("2025-01-10", monthly, { ...monthly, day: 16 });
    const first = await interpretCommand(deps, "internet Vivo, 120, todo dia 15");
    if (!first.ok) throw new Error("esperava uma Prévia");

    const result = await correctPreview(deps, first.preview, "não, é dia 16");

    expect(result).toEqual({ ok: true, preview: { ...first.preview, day: 16, startDate: "2025-01-16" } });
    expect(interpreter.correctCalls).toEqual([{ previous: monthly, correction: "não, é dia 16", today: "2025-01-10" }]);
    expect(await repository.listBills(USER)).toEqual([]);
  });

  it("mantém o texto original do Comando", async () => {
    const { deps } = setup("2025-01-10", monthly, { ...monthly, day: 16 });
    const first = await interpretCommand(deps, "texto original");
    if (!first.ok) throw new Error("esperava uma Prévia");
    const result = await correctPreview(deps, first.preview, "dia 16");
    expect(result.ok && result.preview.originalText).toBe("texto original");
  });

  it("devolve not_understood quando a correção não é entendida", async () => {
    const { deps } = setup("2025-01-10", monthly, null);
    const first = await interpretCommand(deps, "x");
    if (!first.ok) throw new Error("esperava uma Prévia");
    expect(await correctPreview(deps, first.preview, "blá")).toEqual({ ok: false, error: "not_understood" });
  });

  it("rejeita uma Prévia inválida vinda do cliente", async () => {
    const { deps, interpreter } = setup();
    const result = await correctPreview(deps, { ...monthly, day: 99 } as unknown as Preview, "dia 16");
    expect(result).toEqual({ ok: false, error: "invalid_preview" });
    expect(interpreter.correctCalls).toEqual([]);
  });
});

describe("confirmPreview", () => {
  it("salva a Conta só na confirmação", async () => {
    const { deps, repository } = setup("2025-01-10", monthly);
    const preview = await previewOf(monthly);
    expect(await repository.listBills(USER)).toEqual([]);

    const result = await confirmPreview(deps, USER, preview);

    expect(result).toMatchObject({ ok: true });
    expect(await repository.listBills(USER)).toEqual([
      {
        id: expect.any(String),
        title: "Internet Vivo",
        amount: 120,
        recurrence: "monthly",
        day: 15,
        startDate: "2025-01-15",
        tags: ["utilities"],
        registeredOn: "2025-01-10",
      },
    ]);
  });

  it("valida a Prévia de novo no servidor e não salva nada se ela for inválida", async () => {
    const { deps, repository } = setup();
    const preview = await previewOf(monthly);
    const result = await confirmPreview(deps, USER, { ...preview, tags: ["inexistente"] } as unknown as Preview);
    expect(result).toEqual({ ok: false, error: "invalid_preview" });
    expect(await repository.listBills(USER)).toEqual([]);
  });

  it("a Data de início é o próximo Vencimento que ainda dá para pagar: vale a Data efetiva, não a nominal", async () => {
    // 15/06/2025 é domingo: a Data efetiva é segunda, 16/06, o dia do cadastro.
    const { deps, repository } = setup("2025-06-16", monthly);
    await confirmPreview(deps, USER, await previewOf(monthly, "2025-06-16"));

    const [bill] = await repository.listBills(USER);
    expect(bill.startDate).toBe("2025-06-15");
    const [june] = (await getMonth(deps, USER, "2025-06")).days["2025-06-16"];
    expect(june).toMatchObject({ referenceMonth: "2025-06", isPaid: false, isOverdue: false });
  });

  it("o Vencimento do mês anterior conta quando a Data efetiva dele ainda não passou", async () => {
    // 31/05/2025 é sábado: a Data efetiva é segunda, 02/06. Hoje é domingo, 01/06.
    const draft: Draft = { ...monthly, day: 31 };
    const { deps, repository } = setup("2025-06-01", draft);
    await confirmPreview(deps, USER, await previewOf(draft, "2025-06-01"));

    expect((await repository.listBills(USER))[0].startDate).toBe("2025-05-31");
  });

  it("recalcula as datas a partir dos campos, ignorando datas adulteradas", async () => {
    const { deps, repository } = setup();
    const preview = await previewOf(monthly);
    await confirmPreview(deps, USER, { ...preview, startDate: "1999-01-01", endDate: "1999-02-01" });
    const [bill] = await repository.listBills(USER);
    expect(bill.startDate).toBe("2025-01-15");
    expect(bill.endDate).toBeUndefined();
  });
});

describe("getMonth", () => {
  it("devolve os Vencimentos do mês agrupados por Data efetiva", async () => {
    const { deps } = setup("2025-01-10");
    await confirmPreview(deps, USER, await previewOf({ ...monthly, title: "Internet", day: 15 }));
    await confirmPreview(deps, USER, await previewOf({ ...monthly, title: "Água", day: 15 }));
    await confirmPreview(deps, USER, await previewOf({ ...monthly, title: "Luz", day: 20 }));

    const month = await getMonth(deps, USER, "2025-01");

    expect(Object.keys(month.days)).toEqual(["2025-01-15", "2025-01-20"]);
    expect(month.days["2025-01-15"].map((o) => o.title)).toEqual(["Água", "Internet"]);
    expect(month.days["2025-01-20"].map((o) => o.title)).toEqual(["Luz"]);
  });

  it("mostra a Conta de maio em 2/jun, com o Mês de referência de maio", async () => {
    const { deps } = setup("2025-05-01");
    await confirmPreview(deps, USER, await previewOf({ ...monthly, title: "Energia", day: 31 }, "2025-05-01"));

    expect((await getMonth(deps, USER, "2025-05")).days).toEqual({});
    const june = await getMonth(deps, USER, "2025-06");
    expect(june.days["2025-06-02"]).toHaveLength(1);
    expect(june.days["2025-06-02"][0]).toMatchObject({ title: "Energia", referenceMonth: "2025-05", dueDate: "2025-05-31" });
  });

  it("navega para meses anteriores ao cadastro (já Pagos) e para meses futuros", async () => {
    const { deps } = setup("2025-01-10");
    await confirmPreview(deps, USER, await previewOf({ ...monthly, startMonth: "2024-08" }));

    const past = await getMonth(deps, USER, "2024-09");
    expect(past.days["2024-09-16"][0]).toMatchObject({ isPaid: true, isOverdue: false }); // 15/09/2024 é domingo
    const future = await getMonth(deps, USER, "2030-03");
    expect(future.days["2030-03-15"]).toHaveLength(1);
  });

  it("devolve um mês vazio quando nada vence", async () => {
    const { deps } = setup();
    expect(await getMonth(deps, USER, "2025-01")).toMatchObject({ month: "2025-01", days: {}, overdue: [] });
  });

  it("não mostra as Contas de outro Usuário", async () => {
    const { deps } = setup();
    await confirmPreview(deps, "outra", await previewOf(monthly));
    expect((await getMonth(deps, USER, "2025-01")).days).toEqual({});
  });
});

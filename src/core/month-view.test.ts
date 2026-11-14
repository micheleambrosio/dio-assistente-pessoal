import { describe, expect, it } from "vitest";
import { confirmPreview, getMonth, interpretCommand } from "./commands";
import type { Draft } from "./domain";
import { FakeCalendarGateway } from "./fakes/fake-calendar-gateway";
import { FakeCommandInterpreter } from "./fakes/fake-command-interpreter";
import { FixedClock } from "./fakes/fixed-clock";
import { InMemoryRepository } from "./fakes/in-memory-repository";
import { togglePaid } from "./payments";

const USER = "user-1";

const at = (date: string) => new FixedClock(new Date(`${date}T12:00:00-03:00`));

/** Um app em memória cujo "hoje" pode andar: cadastre num dia, consulte em outro. */
function setup(today: string) {
  const repository = new InMemoryRepository();
  const deps = { repository, calendar: new FakeCalendarGateway(), appUrl: "https://contas.example.com", clock: at(today), interpreter: new FakeCommandInterpreter(null, null) };
  return { deps, repository, on: (date: string) => ({ ...deps, clock: at(date) }) };
}

async function register(deps: ReturnType<typeof setup>["deps"], draft: Draft) {
  const result = await interpretCommand({ ...deps, interpreter: new FakeCommandInterpreter(draft, null) }, USER, "comando");
  if (!result.ok) throw new Error("esperava uma Prévia");
  const confirmed = await confirmPreview(deps, USER, result.preview);
  if (!confirmed.ok) throw new Error("esperava confirmar");
  return confirmed.billId;
}

const bill = (title: string, day: number, amount?: number): Draft => ({
  title,
  recurrence: "monthly",
  day,
  tags: ["utilities"],
  ...(amount !== undefined && { amount }),
});

describe("Atrasado", () => {
  it("é o Vencimento não Pago com a Data efetiva antes de hoje", async () => {
    const { deps, on } = setup("2025-01-01");
    await register(deps, bill("Luz", 10, 100)); // 10/01 é sexta

    const onTheDay = await getMonth(on("2025-01-10"), USER, "2025-01");
    expect(onTheDay.days["2025-01-10"][0].isOverdue).toBe(false);
    expect(onTheDay.overdue).toEqual([]);

    const nextDay = await getMonth(on("2025-01-11"), USER, "2025-01");
    expect(nextDay.days["2025-01-10"][0].isOverdue).toBe(true);
    expect(nextDay.overdue.map((o) => o.effectiveDate)).toEqual(["2025-01-10"]);
  });

  it("desmarcar o Pago de um Vencimento de hoje não o torna Atrasado, nem o duplica", async () => {
    const { deps, on } = setup("2025-01-01");
    const billId = await register(deps, bill("Luz", 10, 100));
    const today = on("2025-01-10");
    await togglePaid(today, USER, { billId, referenceMonth: "2025-01", paid: true });

    await togglePaid(today, USER, { billId, referenceMonth: "2025-01", paid: false });

    const view = await getMonth(today, USER, "2025-01");
    expect(view.days["2025-01-10"][0]).toMatchObject({ isPaid: false, isOverdue: false });
    expect(view.overdue).toEqual([]);
    expect(view.summary).toMatchObject({ overdueTotal: 0, toPayTotal: 100 });
  });

  it("Pago deixa de ser Atrasado", async () => {
    const { deps, on } = setup("2025-01-01");
    const billId = await register(deps, bill("Luz", 10, 100));

    await togglePaid(on("2025-01-20"), USER, { billId, referenceMonth: "2025-01", paid: true });

    expect((await getMonth(on("2025-01-20"), USER, "2025-01")).overdue).toEqual([]);
  });
});

describe("bloco global de Atrasadas", () => {
  it("aparece em qualquer mês aberto, na ordem das Datas efetivas, de qualquer Conta", async () => {
    const { deps, on } = setup("2025-01-01");
    await register(deps, bill("Luz", 10, 100));
    await register(deps, bill("Água", 5, 50));

    const today = on("2025-03-20");
    const overdueTitles = async (month: string) =>
      (await getMonth(today, USER, month)).overdue.map((o) => `${o.effectiveDate} ${o.title}`);

    const expected = [
      "2025-01-06 Água", // 05/01 é domingo
      "2025-01-10 Luz",
      "2025-02-05 Água",
      "2025-02-10 Luz",
      "2025-03-05 Água",
      "2025-03-10 Luz",
    ];
    expect(await overdueTitles("2025-03")).toEqual(expected);
    expect(await overdueTitles("2025-01")).toEqual(expected); // mês passado
    expect(await overdueTitles("2030-01")).toEqual(expected); // mês futuro
  });

  it("some quando não há nenhum Atrasado", async () => {
    const { deps, on } = setup("2025-01-01");
    await register(deps, bill("Luz", 10, 100));
    expect((await getMonth(on("2025-01-05"), USER, "2025-01")).overdue).toEqual([]);
  });

  it("não traz Vencimentos anteriores ao cadastro, que nascem Pagos", async () => {
    const { deps, on } = setup("2025-03-01");
    await register(deps, { ...bill("Luz", 10, 100), startMonth: "2024-11" });
    expect((await getMonth(on("2025-03-01"), USER, "2025-03")).overdue).toEqual([]);
  });
});

describe("Resumo do mês", () => {
  it("soma Pago, A pagar, Atrasado e Total, e conta o progresso", async () => {
    const { deps, on } = setup("2025-06-01");
    const luz = await register(deps, bill("Luz", 10, 100)); // 10/06
    await register(deps, bill("Água", 20, 50)); // 20/06
    await register(deps, bill("Net", 25, 80)); // 25/06
    await togglePaid(deps, USER, { billId: luz, referenceMonth: "2025-06", paid: true, amount: 110 });

    const { summary } = await getMonth(on("2025-06-22"), USER, "2025-06");

    expect(summary).toEqual({
      paidTotal: 110,
      toPayTotal: 130,
      overdueTotal: 50,
      total: 240,
      paidCount: 1,
      count: 3,
      withoutAmountCount: 0,
    });
  });

  it("é pelo Mês de referência: a Energia de maio paga em 2/jun conta em maio", async () => {
    const { deps, on } = setup("2025-05-01");
    const energia = await register(deps, bill("Energia", 31, 200)); // vence 31/05 (sábado), Data efetiva 02/06
    const today = on("2025-06-02");
    await togglePaid(today, USER, { billId: energia, referenceMonth: "2025-05", paid: true });

    const may = await getMonth(today, USER, "2025-05");
    const june = await getMonth(today, USER, "2025-06");

    expect(may.summary).toMatchObject({ paidTotal: 200, paidCount: 1, count: 1 });
    expect(may.referenceOccurrences.map((o) => o.title)).toEqual(["Energia"]);
    expect(june.summary).toMatchObject({ paidTotal: 0, paidCount: 0, count: 1 }); // a de junho é outra
    expect(june.days["2025-06-02"][0]).toMatchObject({ title: "Energia", referenceMonth: "2025-05" });
  });

  it("Vencimentos sem valor entram no progresso e não nos totais", async () => {
    const { deps, on } = setup("2025-06-01");
    const sem = await register(deps, bill("Condomínio", 10)); // sem valor
    await register(deps, bill("Luz", 12, 100));
    await register(deps, bill("Net", 14));
    await togglePaid(deps, USER, { billId: sem, referenceMonth: "2025-06", paid: true });

    const { summary } = await getMonth(on("2025-06-05"), USER, "2025-06");

    expect(summary).toEqual({
      paidTotal: 0,
      toPayTotal: 100,
      overdueTotal: 0,
      total: 100,
      paidCount: 1,
      count: 3,
      withoutAmountCount: 2,
    });
  });

  it("um mês sem Vencimentos tem Resumo vazio", async () => {
    const { deps } = setup("2025-06-01");
    expect((await getMonth(deps, USER, "2025-06")).summary).toMatchObject({ count: 0, total: 0 });
  });
});

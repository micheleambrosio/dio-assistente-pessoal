import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

// "Hoje" é 12/06/2025 e os dados são os do protótipo (prototype/tela-principal). Ver src/infra/runtime.ts.
test.beforeEach(async ({ request }) => {
  expect((await request.post("/e2e/reset")).status()).toBe(204);
});

const calendar = (page: Page) => page.getByRole("region", { name: "Calendário" });
const day = (page: Page, n: number) => calendar(page).getByRole("link", { name: new RegExp(`^Dia ${n}(,|$)`) });
const summary = (page: Page) => page.getByRole("region", { name: "Resumo do mês" });
const overdue = (page: Page) => page.getByRole("region", { name: "Atrasadas" });
const dayList = (page: Page, n: number) => page.getByRole("region", { name: new RegExp(`^Contas do dia ${n} de `) });
/** O cartão do Vencimento, a partir do check dele. */
const row = (scope: Locator, title: string) =>
  scope.getByRole("button", { name: new RegExp(`^(Marcar|Desmarcar) ${title} como paga$`) }).locator("xpath=ancestor::li[1]");

test("o app abre no mês corrente, com o dia de hoje selecionado", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/junho\s*2025/i);
  await expect(day(page, 12)).toHaveAttribute("aria-current", "date");
  await expect(page.getByRole("heading", { name: /^Hoje/ })).toBeVisible();
  await expect(row(dayList(page, 12), "Parcela do notebook")).toBeVisible();
  expect(isMobile).toBe(page.viewportSize()!.width < 640);
});

test("o tema segue o esquema de cores do navegador", async ({ page }, info) => {
  await page.goto("/");
  const expected = info.project.name.endsWith("dark") ? "dark" : "light";
  await expect(page.locator("html")).toHaveAttribute("data-theme", expected);
});

test.describe("Calendário", () => {
  test("um dia com 4 ou mais Vencimentos mostra 2 chips e “+N contas” no desktop, e a lista completa no dia", async ({ page, isMobile }) => {
    await page.goto("/?m=2025-06&d=2025-06-10");
    const cell = day(page, 10);
    await expect(cell).toHaveAccessibleName("Dia 10, 4 Contas");

    if (isMobile) {
      // No mobile os chips dão lugar a pontos.
      await expect(cell.getByText("+2 contas")).toBeHidden();
      await expect(cell.getByText("Academia Smart Fit")).toBeHidden();
    } else {
      await expect(cell.getByText("Academia Smart Fit")).toBeVisible();
      await expect(cell.getByText("Água", { exact: true })).toBeVisible();
      await expect(cell.getByText("Cartão Nubank")).toBeHidden();
      await expect(cell.getByText("+2 contas")).toBeVisible();
    }

    const list = dayList(page, 10);
    for (const title of ["Água", "Cartão Nubank", "Academia Smart Fit", "Netflix"]) {
      await expect(row(list, title)).toBeVisible();
    }
  });

  test("tocar num dia mostra os Vencimentos dele", async ({ page }) => {
    await page.goto("/");
    await day(page, 18).click();
    await expect(page).toHaveURL(/d=2025-06-18/);
    await expect(row(dayList(page, 18), "Seguro do carro")).toBeVisible();
  });

  test("o dia com Atrasado fica em vermelho e o chip dele também (desktop)", async ({ page, isMobile }) => {
    await page.goto("/?m=2025-06");
    await expect(day(page, 10)).toHaveClass(/bg-dangersoft/);
    await expect(day(page, 12)).not.toHaveClass(/bg-dangersoft/);
    if (!isMobile) await expect(day(page, 5).getByText("Condomínio")).toHaveClass(/bg-danger\b/);
  });
});

test.describe("Vencimento sem valor", () => {
  test("mostra o selo “sem valor” e entra em “+N contas sem valor”, e não nos totais", async ({ page }) => {
    await page.goto("/?m=2025-06&d=2025-06-10");
    await expect(row(dayList(page, 10), "Água").getByText("sem valor")).toBeVisible();
    await expect(row(dayList(page, 10), "Netflix").getByText("sem valor")).toHaveCount(0);

    // Junho: Energia e Água não têm valor.
    await expect(summary(page).getByText("+2 contas sem valor")).toBeVisible();
    // Total = soma só dos Vencimentos com valor (sem Energia nem Água).
    await expect(summary(page).getByText("Total").locator("xpath=following-sibling::span")).toHaveText(/R\$\s*8\.\d{3},\d{2}/);
  });
});

test.describe("Mês de referência", () => {
  test("a “Energia de maio” aparece em 2/jun com “ref. maio” e entra no Resumo de maio", async ({ page }) => {
    await page.goto("/?m=2025-06&d=2025-06-02");
    await expect(day(page, 2)).toHaveAccessibleName("Dia 2, 1 Conta");
    const energy = row(dayList(page, 2), "Energia");
    await expect(energy.getByText("ref. maio")).toBeVisible();
    // O Resumo de junho não a conta: a dela é a de 30/06.
    await page.getByRole("button", { name: "Pago" }).click();
    const drawerJune = page.getByRole("dialog");
    await expect(drawerJune.getByText("vence 02/06")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(drawerJune).toBeHidden();

    // O Resumo de maio sim: ela é de maio, mesmo vencendo em 2/jun.
    await page.goto("/?m=2025-05");
    await page.getByRole("button", { name: "Pago" }).click();
    const drawer = page.getByRole("dialog");
    const toPay = drawer.getByRole("region", { name: "A pagar" });
    await expect(toPay.getByText("Energia")).toBeVisible();
    await expect(toPay.getByText("vence 02/06")).toBeVisible();
  });
});

test.describe("Estados do Vencimento", () => {
  test("Atrasado, Pago e a pagar convivem no mesmo mês, cada um com o seu estilo", async ({ page }) => {
    await page.goto("/?m=2025-06&d=2025-06-10");
    const list = dayList(page, 10);
    await expect(row(list, "Água")).toHaveClass(/bg-late/);
    await expect(row(list, "Água").getByText("Atrasada")).toBeVisible();
    await expect(row(list, "Cartão Nubank")).toHaveClass(/bg-dark/);
    await expect(row(list, "Cartão Nubank").getByText("Atrasada")).toHaveCount(0);

    await page.goto("/?m=2025-06&d=2025-06-20");
    const open = row(dayList(page, 20), "Plano de saúde");
    await expect(open).toHaveClass(/bg-surface\b/);
    await expect(open).not.toHaveClass(/bg-late|bg-dark/);
  });

  test("marcar como Pago troca o estilo e atualiza o Resumo", async ({ page }) => {
    await page.goto("/?m=2025-06&d=2025-06-20");
    const progress = summary(page).getByRole("progressbar", { name: "Progresso do mês" });
    const before = Number(await progress.getAttribute("aria-valuenow"));
    await row(dayList(page, 20), "Plano de saúde").getByRole("button", { name: "Marcar Plano de saúde como paga" }).click();
    await expect(row(dayList(page, 20), "Plano de saúde")).toHaveClass(/bg-dark/);
    await expect(progress).toHaveAttribute("aria-valuenow", String(before + 1));
  });

  test("Vencimentos avulso e anual mostram o selo de Periodicidade", async ({ page }) => {
    await page.goto("/?m=2025-06&d=2025-06-18");
    await expect(row(dayList(page, 18), "Seguro do carro").getByText("Anual", { exact: true })).toBeVisible();
    await page.goto("/?m=2025-06&d=2025-06-24");
    await expect(row(dayList(page, 24), "Dentista \\(limpeza\\)").getByText("Avulsa", { exact: true })).toBeVisible();
    // Mensal não leva selo.
    await page.goto("/?m=2025-06&d=2025-06-20");
    await expect(row(dayList(page, 20), "Plano de saúde").getByText(/^(Mensal|Anual|Avulsa)$/)).toHaveCount(0);
  });
});

test.describe("Mês vazio", () => {
  test("mostra “Mês vazio” no Resumo e “Nenhuma Conta vence neste dia” na lista", async ({ page }) => {
    await page.goto("/?m=2025-01");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/janeiro\s*2025/i);
    await expect(page.getByRole("button", { name: /Resumo do mês/ })).toContainText("Mês vazio");
    await expect(page.getByText("Nenhuma Conta vence neste dia")).toBeVisible();
  });
});

test.describe("Atrasadas", () => {
  test("o bloco aparece em qualquer mês enquanto houver algum Atrasado", async ({ page }) => {
    for (const month of ["2025-01", "2025-05", "2025-06", "2025-09"]) {
      await page.goto(`/?m=${month}`);
      const block = overdue(page);
      await expect(block).toBeVisible();
      for (const title of ["Energia", "Condomínio", "Água"]) await expect(row(block, title)).toBeVisible();
    }
  });

  test("o bloco some quando o último Atrasado é marcado como Pago", async ({ page }) => {
    await page.goto("/?m=2025-09");
    for (const title of ["Energia", "Condomínio", "Água"]) {
      await row(overdue(page), title).getByRole("button", { name: `Marcar ${title} como paga` }).click();
      await expect(row(overdue(page), title)).toHaveCount(0);
    }
    await expect(overdue(page)).toHaveCount(0);
  });
});

test.describe("Comando", () => {
  test("Comando → Prévia → Confirmar → o item aparece", async ({ page }) => {
    await page.goto("/?m=2025-06&d=2025-06-25");
    await expect(page.getByText("Nenhuma Conta vence neste dia")).toBeVisible();
    await expect(day(page, 25)).toHaveAccessibleName("Dia 25");

    await page.getByRole("textbox", { name: "Comando" }).fill("spotify 21,90 todo dia 25");
    await page.getByRole("button", { name: "Enviar Comando" }).click();

    const preview = page.getByRole("region", { name: "Prévia" });
    await expect(preview.getByText("Você escreveu: spotify 21,90 todo dia 25")).toBeVisible();
    await expect(preview.getByText("Spotify", { exact: true })).toBeVisible();
    await expect(preview.getByText("R$ 21,90")).toBeVisible();
    await expect(preview.getByText("Mensal (Conta fixa)")).toBeVisible();
    // Nada muda até confirmar.
    await expect(page.getByText("Nenhuma Conta vence neste dia")).toBeVisible();

    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(preview).toBeHidden();

    await expect(day(page, 25)).toHaveAccessibleName("Dia 25, 1 Conta");
    const created = row(dayList(page, 25), "Spotify");
    await expect(created).toBeVisible();
    await expect(created.getByText("R$ 21,90")).toBeVisible();
  });

  test("descartar a Prévia não cadastra nada", async ({ page }) => {
    await page.goto("/?m=2025-06&d=2025-06-25");
    await page.getByRole("textbox", { name: "Comando" }).fill("spotify 21,90 todo dia 25");
    await page.getByRole("button", { name: "Enviar Comando" }).click();
    await page.getByRole("button", { name: "Descartar" }).click();
    await page.reload();
    await expect(day(page, 25)).toHaveAccessibleName("Dia 25");
  });
});

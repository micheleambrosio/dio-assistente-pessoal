// PROTÓTIPO DESCARTÁVEL — dados mockados, sem backend/Gemini/Calendar.
import dayjs from "dayjs";
import type { Conta, Vencimento } from "./types";

/** "Hoje" fixo para o mock: com ele, a Energia de maio (31/05 sáb.) tem Data efetiva 02/06 (ADR 0001). */
export const HOJE = "2025-06-12";

// Feriados nacionais + Carnaval (seg/ter) + Corpus Christi
const FERIADOS = new Set([
  "2024-01-01","2024-02-12","2024-02-13","2024-03-29","2024-05-01","2024-05-30","2024-09-07","2024-10-12","2024-11-02","2024-11-15","2024-11-20","2024-12-25",
  "2025-01-01","2025-03-03","2025-03-04","2025-04-18","2025-04-21","2025-05-01","2025-06-19","2025-09-07","2025-10-12","2025-11-02","2025-11-15","2025-11-20","2025-12-25",
  "2026-01-01","2026-02-16","2026-02-17","2026-04-03","2026-04-21","2026-05-01","2026-06-04","2026-09-07","2026-10-12","2026-11-02","2026-11-15","2026-11-20","2026-12-25",
]);

const fmt = (d: dayjs.Dayjs) => d.format("YYYY-MM-DD");
export const isDiaUtil = (iso: string) => {
  const d = dayjs(iso);
  return d.day() !== 0 && d.day() !== 6 && !FERIADOS.has(iso);
};
export const dataEfetiva = (iso: string) => {
  let d = dayjs(iso);
  while (!isDiaUtil(fmt(d))) d = d.add(1, "day");
  return fmt(d);
};

export const CONTAS_INICIAIS: Conta[] = [
  { id: "aluguel", titulo: "Aluguel", periodicidade: "mensal", dia: 5, valor: 1850, etiquetas: ["Moradia"], inicio: "2025-02" },
  { id: "condominio", titulo: "Condomínio", periodicidade: "mensal", dia: 5, valor: 620, etiquetas: ["Moradia"], inicio: "2025-02" },
  { id: "internet", titulo: "Internet Vivo", periodicidade: "mensal", dia: 15, valor: 119.9, etiquetas: ["Utilidades", "Assinaturas"], inicio: "2025-02" },
  { id: "energia", titulo: "Energia", periodicidade: "mensal", dia: 31, etiquetas: ["Moradia", "Utilidades"], inicio: "2025-02" }, // sem valor
  { id: "agua", titulo: "Água", periodicidade: "mensal", dia: 10, etiquetas: ["Moradia", "Utilidades"], inicio: "2025-02" },       // sem valor
  { id: "cartao", titulo: "Cartão Nubank", periodicidade: "mensal", dia: 10, valor: 2340.12, etiquetas: ["Cartão"], inicio: "2025-02" },
  { id: "academia", titulo: "Academia Smart Fit", periodicidade: "mensal", dia: 10, valor: 99.9, etiquetas: ["Saúde", "Lazer"], inicio: "2025-02" },
  { id: "netflix", titulo: "Netflix", periodicidade: "mensal", dia: 10, valor: 55.9, etiquetas: ["Assinaturas", "Lazer"], inicio: "2025-02" },
  { id: "plano", titulo: "Plano de saúde", periodicidade: "mensal", dia: 20, valor: 780, etiquetas: ["Saúde"], inicio: "2025-02" },
  { id: "notebook", titulo: "Parcela do notebook", periodicidade: "mensal", dia: 12, valor: 389.9, etiquetas: ["Outros"], inicio: "2025-02", fim: "2025-12" },
  { id: "seguro", titulo: "Seguro do carro", periodicidade: "anual", dia: 18, mes: 6, valor: 2480, etiquetas: ["Seguros", "Transporte"], inicio: "2024-06" },
  { id: "dentista", titulo: "Dentista (limpeza)", periodicidade: "avulsa", dia: 24, mes: 6, ano: 2025, valor: 350, etiquetas: ["Saúde"], inicio: "2025-06" },
  { id: "curso", titulo: "Matrícula do curso de inglês", periodicidade: "avulsa", dia: 3, mes: 7, ano: 2025, valor: 450, etiquetas: ["Educação"], inicio: "2025-07" },
];

/** Valor do Vencimento que substitui o da Conta naquele mês. */
const VALOR_DO_VENCIMENTO: Record<string, number> = { "energia-2025-05": 187.4, "energia-2025-04": 201.15, "agua-2025-05": 74.3 };
/** Vencimentos passados que continuam sem pagamento (viram Atrasados). */
const NAO_PAGOS = new Set(["energia-2025-05", "condominio-2025-06", "agua-2025-06"]);
/** Vencimentos futuros já pagos antecipadamente. */
const PAGOS_ANTES = new Set(["internet-2025-06"]);

const mesDe = (ym: string) => dayjs(ym + "-01");

function vencimentosDoMesRef(contas: Conta[], ym: string, overrides: Record<string, boolean>): Vencimento[] {
  const base = mesDe(ym);
  const out: Vencimento[] = [];
  for (const c of contas) {
    if (c.inicio > ym) continue;
    if (c.fim && ym > c.fim) continue;
    if (c.periodicidade === "anual" && base.month() + 1 !== c.mes) continue;
    if (c.periodicidade === "avulsa" && (ym !== `${c.ano}-${String(c.mes).padStart(2, "0")}`)) continue;
    const dia = Math.min(c.dia, base.daysInMonth()); // dia inexistente → último dia do mês
    const venc = fmt(base.date(dia));
    const eff = dataEfetiva(venc);
    const id = `${c.id}-${ym}`;
    const padraoPago = PAGOS_ANTES.has(id) || (eff < HOJE && !NAO_PAGOS.has(id));
    const pago = id in overrides ? overrides[id] : padraoPago;
    out.push({
      id, contaId: c.id, titulo: c.titulo, periodicidade: c.periodicidade, etiquetas: c.etiquetas,
      valor: VALOR_DO_VENCIMENTO[id] ?? c.valor, mesReferencia: ym, dataVencimento: venc, dataEfetiva: eff,
      pago, atrasado: !pago && eff < HOJE,
    });
  }
  return out;
}

/** Vencimentos do Mês de referência `ym` (para o Resumo do mês). */
export const doMesRef = (contas: Conta[], ym: string, ov: Record<string, boolean>) => vencimentosDoMesRef(contas, ym, ov);

/** Vencimentos que aparecem no Calendário de `ym` (Data efetiva no mês; inclui os do mês anterior que cruzam). */
export function noCalendario(contas: Conta[], ym: string, ov: Record<string, boolean>): Vencimento[] {
  const prev = mesDe(ym).subtract(1, "month").format("YYYY-MM");
  return [...vencimentosDoMesRef(contas, prev, ov), ...vencimentosDoMesRef(contas, ym, ov)].filter((v) => v.dataEfetiva.startsWith(ym));
}

/** Todos os Atrasados até hoje (de qualquer mês). */
export function atrasados(contas: Conta[], ov: Record<string, boolean>): Vencimento[] {
  const out: Vencimento[] = [];
  let m = mesDe("2025-02");
  const fim = mesDe(HOJE.slice(0, 7));
  while (!m.isAfter(fim)) {
    out.push(...vencimentosDoMesRef(contas, m.format("YYYY-MM"), ov).filter((v) => v.atrasado));
    m = m.add(1, "month");
  }
  return out.sort((a, b) => a.dataEfetiva.localeCompare(b.dataEfetiva));
}

export type Resumo = { pago: number; aPagar: number; atrasadoValor: number; total: number; qtdPagas: number; qtd: number; semValor: number; pagos: Vencimento[]; aPagarLista: Vencimento[] };
export function resumo(vs: Vencimento[]): Resumo {
  const soma = (xs: Vencimento[]) => xs.reduce((s, v) => s + (v.valor ?? 0), 0);
  const pagos = vs.filter((v) => v.pago);
  const aPagarLista = vs.filter((v) => !v.pago);
  return {
    pago: soma(pagos), aPagar: soma(aPagarLista), atrasadoValor: soma(aPagarLista.filter((v) => v.atrasado)),
    total: soma(vs), qtdPagas: pagos.length, qtd: vs.length, semValor: vs.filter((v) => v.valor == null).length, pagos, aPagarLista,
  };
}

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
export const DIAS_SEMANA = ["dom","seg","ter","qua","qui","sex","sáb"];
export const MES_VAZIO = "2025-01";

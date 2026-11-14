import type { Draft } from "@/core/domain";
import type { EvalCase } from "./score";

/** O "hoje" de todas as frases: "desde janeiro" e "a partir de julho" dependem dele. */
export const EVAL_TODAY = "2025-06-12";

const internet: Draft = { title: "Internet Vivo", amount: 120, recurrence: "monthly", day: 15, tags: ["utilities"] };

/**
 * Conjunto fixo de frases em pt-BR com a saída estruturada esperada.
 * O Interpretador hoje só cadastra Contas: os pedidos de outras intenções ("paguei a água",
 * "cancelei a Netflix") valem como recusa até existirem (ver `intent: "other-intent"`).
 */
export const CASES: EvalCase[] = [
  // Mensal
  { id: "mensal-basico", intent: "monthly", text: "internet Vivo, 120, todo dia 15", expect: { understood: true, title: "internet", amount: 120, recurrence: "monthly", day: 15, tags: ["utilities"], absent: ["month", "year", "startMonth", "endMonth", "installments"] } },
  { id: "mensal-sem-valor", intent: "monthly", text: "energia todo dia 10", expect: { understood: true, title: "energia", recurrence: "monthly", day: 10, tags: ["utilities"], absent: ["amount"] } },
  { id: "mensal-virgula", intent: "monthly", text: "Netflix 55,90 todo dia 10", expect: { understood: true, title: "netflix", amount: 55.9, recurrence: "monthly", day: 10, tags: ["subscriptions"] } },
  { id: "mensal-milhar", intent: "monthly", text: "aluguel de 1.850 reais todo dia 5", expect: { understood: true, title: "aluguel", amount: 1850, recurrence: "monthly", day: 5, tags: ["housing"] } },
  { id: "mensal-fim-do-mes", intent: "monthly", text: "cartão Nubank todo dia 31, 2340,12", expect: { understood: true, title: "nubank", amount: 2340.12, recurrence: "monthly", day: 31, tags: ["credit_card"] } },

  // Valores por extenso
  { id: "extenso-simples", intent: "amount-in-words", text: "internet cento e vinte reais todo dia 15", expect: { understood: true, amount: 120, recurrence: "monthly", day: 15 } },
  { id: "extenso-mil", intent: "amount-in-words", text: "aluguel mil e oitocentos reais todo dia 5", expect: { understood: true, amount: 1800, day: 5 } },
  { id: "extenso-centavos", intent: "amount-in-words", text: "condomínio seiscentos e cinquenta e dois reais e cinquenta centavos todo dia 5", expect: { understood: true, amount: 652.5, day: 5 } },
  { id: "extenso-sem-moeda", intent: "amount-in-words", text: "plano de saúde setecentos e oitenta todo dia 20", expect: { understood: true, amount: 780, day: 20, tags: ["health"] } },

  // Anual
  { id: "anual-basico", intent: "yearly", text: "seguro do carro todo 15 de agosto, 2480", expect: { understood: true, title: "seguro", amount: 2480, recurrence: "yearly", day: 15, month: 8, tags: ["insurance"] } },
  { id: "anual-imposto", intent: "yearly", text: "IPTU todo dia 10 de fevereiro", expect: { understood: true, title: "iptu", recurrence: "yearly", day: 10, month: 2, tags: ["taxes"], absent: ["amount"] } },
  { id: "anual-anuidade", intent: "yearly", text: "anuidade do CRC todo dia 30 de março, 750", expect: { understood: true, amount: 750, recurrence: "yearly", day: 30, month: 3 } },

  // Avulsa
  { id: "avulsa-sem-ano", intent: "once", text: "IPVA 20 de março", expect: { understood: true, title: "ipva", recurrence: "once", day: 20, month: 3, tags: ["taxes"], absent: ["amount"] } },
  { id: "avulsa-com-valor", intent: "once", text: "dentista dia 24 de junho, 350 reais", expect: { understood: true, title: "dentista", amount: 350, recurrence: "once", day: 24, month: 6, tags: ["health"] } },
  { id: "avulsa-com-ano", intent: "once", text: "matrícula do curso de inglês 3 de julho de 2025, 450", expect: { understood: true, amount: 450, recurrence: "once", day: 3, month: 7, year: 2025, tags: ["education"] } },

  // "desde …"
  { id: "desde-janeiro", intent: "since", text: "geladeira em 10x de 300 reais, todo dia 8, desde janeiro", expect: { understood: true, title: "geladeira", amount: 300, recurrence: "monthly", day: 8, installments: 10, startMonth: "2025-01" } },
  { id: "desde-mes-passado-do-ano", intent: "since", text: "comecei a pagar o financiamento do carro em agosto, 1200 por mês, todo dia 7", expect: { understood: true, amount: 1200, recurrence: "monthly", day: 7, startMonth: "2024-08" } },
  { id: "desde-simples", intent: "since", text: "academia desde março, 99,90, todo dia 10", expect: { understood: true, title: "academia", amount: 99.9, day: 10, startMonth: "2025-03", tags: ["health"] } },

  // Parcelas ("10x")
  { id: "parcelas-a-partir-de", intent: "installments", text: "notebook em 10x a partir de julho, 389,90, todo dia 12", expect: { understood: true, title: "notebook", amount: 389.9, recurrence: "monthly", day: 12, installments: 10, startMonth: "2025-07", absent: ["endMonth"] } },
  { id: "parcelas-vezes", intent: "installments", text: "celular em 12 vezes de 250 todo dia 8", expect: { understood: true, title: "celular", amount: 250, day: 8, installments: 12, absent: ["endMonth"] } },
  { id: "parcelas-curto", intent: "installments", text: "sofá 6x de 400, dia 20", expect: { understood: true, title: "sofa", amount: 400, day: 20, installments: 6 } },

  // Data final
  { id: "ate-dezembro", intent: "end-month", text: "internet 120 todo dia 15 até dezembro", expect: { understood: true, amount: 120, day: 15, endMonth: "2025-12", absent: ["installments"] } },
  { id: "ate-mes-e-ano", intent: "end-month", text: "financiamento 900 todo dia 5 até março de 2026", expect: { understood: true, amount: 900, day: 5, endMonth: "2026-03" } },

  // Ambiguidade e o que não é cadastro
  { id: "ambigua-sem-dia", intent: "ambiguity", text: "conta de luz", expect: { understood: false } },
  { id: "ambigua-paguei-a-conta", intent: "ambiguity", text: "paguei a conta", expect: { understood: false } },
  { id: "ambigua-so-valor", intent: "ambiguity", text: "150 reais", expect: { understood: false } },
  { id: "nao-e-comando-conversa", intent: "not-a-bill", text: "oi, tudo bem?", expect: { understood: false } },
  { id: "nao-e-comando-pergunta", intent: "not-a-bill", text: "quanto eu gastei esse mês?", expect: { understood: false } },
  { id: "outra-intencao-pagar", intent: "other-intent", text: "paguei a água", expect: { understood: false } },
  { id: "outra-intencao-encerrar", intent: "other-intent", text: "cancelei a Netflix", expect: { understood: false } },

  // Correção da Prévia
  { id: "correcao-dia", intent: "correction", previous: internet, text: "não, é dia 16", expect: { understood: true, title: "internet", amount: 120, day: 16, recurrence: "monthly" } },
  { id: "correcao-valor", intent: "correction", previous: internet, text: "o valor é 129,90", expect: { understood: true, amount: 129.9, day: 15, recurrence: "monthly" } },
  { id: "correcao-periodicidade", intent: "correction", previous: internet, text: "na verdade é anual, todo dia 10 de março", expect: { understood: true, recurrence: "yearly", day: 10, month: 3 } },
  { id: "correcao-titulo", intent: "correction", previous: internet, text: "chama de Vivo Fibra", expect: { understood: true, title: "vivo fibra", amount: 120, day: 15 } },
];

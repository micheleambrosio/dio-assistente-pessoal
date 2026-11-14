"use client";
// PROTÓTIPO DESCARTÁVEL — estado em memória, Comando/Prévia simulados (sem Gemini).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { CONTAS_INICIAIS, HOJE, atrasados, doMesRef, noCalendario, resumo } from "./data";
import type { Conta, Etiqueta, Periodicidade } from "./types";

export type Previa = {
  origem: "voz" | "texto";
  disse: string;
  intencao: "cadastrar" | "pagar" | "nao-entendi";
  titulo?: string; valor?: number; periodicidade?: Periodicidade; dia?: number; etiquetas: Etiqueta[];
  vencimentoId?: string;
};

const ETQ: [RegExp, Etiqueta][] = [
  [/energia|luz|água|agua|internet|vivo|gás/i, "Utilidades"], [/aluguel|condom/i, "Moradia"], [/netflix|spotify|assinatura/i, "Assinaturas"],
  [/cart[aã]o|nubank/i, "Cartão"], [/plano|dentista|acad|m[eé]dic/i, "Saúde"], [/seguro/i, "Seguros"], [/ipva|iptu|imposto/i, "Impostos"],
];

function interpretar(texto: string, origem: "voz" | "texto", mes: string, contas: Conta[], ov: Record<string, boolean>): Previa {
  const t = texto.trim();
  if (/^paguei|^pago /i.test(t)) {
    const vs = [...atrasados(contas, ov), ...doMesRef(contas, mes, ov)].filter((v) => !v.pago);
    const alvo = vs.find((v) => t.toLowerCase().includes(v.titulo.toLowerCase().split(" ")[0]));
    if (alvo) return { origem, disse: t, intencao: "pagar", titulo: alvo.titulo, valor: alvo.valor, etiquetas: alvo.etiquetas, vencimentoId: alvo.id };
    return { origem, disse: t, intencao: "nao-entendi", etiquetas: [] };
  }
  const valor = t.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:reais)?/);
  const dia = t.match(/dia\s+(\d{1,2})/i);
  const titulo = t.split(/[,.]/)[0].replace(/^(cadastra|cadastrar|adiciona)\s*/i, "").trim() || "Nova conta";
  const etiquetas = ETQ.filter(([r]) => r.test(t)).map(([, e]) => e).slice(0, 3);
  return {
    origem, disse: t, intencao: "cadastrar", titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1),
    valor: valor && !dia?.[0].includes(valor[1]) ? Number(valor[1].replace(",", ".")) : undefined,
    periodicidade: /todo (dia|m[eê]s)|mensal/i.test(t) || dia ? "mensal" : "avulsa", dia: dia ? Number(dia[1]) : 15,
    etiquetas: etiquetas.length ? etiquetas : ["Outros"],
  };
}

export const FRASES_VOZ = ["internet Vivo, 120, todo dia 15", "paguei a água", "dentista 350 reais dia 24 de junho"];
export const LIMITE_VOZ = 30;

export function useApp() {
  const [contas, setContas] = useState<Conta[]>(CONTAS_INICIAIS);
  const [ov, setOv] = useState<Record<string, boolean>>({});
  const [mes, setMes] = useState(HOJE.slice(0, 7));
  const [dia, setDia] = useState(HOJE);
  const [dir, setDir] = useState(1);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [processando, setProcessando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [seg, setSeg] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const fraseIdx = useRef(0);

  const vcal = useMemo(() => noCalendario(contas, mes, ov), [contas, mes, ov]);
  const vref = useMemo(() => doMesRef(contas, mes, ov), [contas, mes, ov]);
  const atras = useMemo(() => atrasados(contas, ov), [contas, ov]);
  const res = useMemo(() => resumo(vref), [vref]);
  const doDia = useMemo(() => vcal.filter((v) => v.dataEfetiva === dia && !v.atrasado), [vcal, dia]);
  const porDia = useMemo(() => {
    const m: Record<string, typeof vcal> = {};
    vcal.forEach((v) => (m[v.dataEfetiva] ??= []).push(v));
    return m;
  }, [vcal]);

  const irMes = useCallback((delta: number) => {
    setDir(delta);
    const novo = dayjs(mes + "-01").add(delta, "month");
    setMes(novo.format("YYYY-MM"));
    setDia(novo.format("YYYY-MM") === HOJE.slice(0, 7) ? HOJE : novo.startOf("month").format("YYYY-MM-DD"));
  }, [mes]);
  const irPara = useCallback((ym: string, d?: string) => {
    setDir(ym >= mes ? 1 : -1); setMes(ym); setDia(d ?? (ym === HOJE.slice(0, 7) ? HOJE : ym + "-01"));
  }, [mes]);

  const alternarPago = (id: string, pago: boolean) => setOv((o) => ({ ...o, [id]: pago }));
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const enviarTexto = (t: string) => {
    if (!t.trim()) return;
    setProcessando(true);
    setTimeout(() => { setPrevia(interpretar(t, "texto", mes, contas, ov)); setProcessando(false); }, 900);
  };

  // Voz: grava até 30 s ou até o usuário parar; a "transcrição" é uma frase de exemplo.
  useEffect(() => {
    if (!gravando) return;
    const id = setInterval(() => setSeg((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [gravando]);
  useEffect(() => { if (gravando && seg >= LIMITE_VOZ) pararVoz(); /* eslint-disable-next-line */ }, [seg, gravando]);
  const iniciarVoz = () => { setSeg(0); setGravando(true); setPrevia(null); };
  const pararVoz = () => {
    setGravando(false); setProcessando(true);
    const frase = FRASES_VOZ[fraseIdx.current++ % FRASES_VOZ.length];
    setTimeout(() => { setPrevia(interpretar(frase, "voz", mes, contas, ov)); setProcessando(false); }, 1100);
  };
  const cancelarVoz = () => { setGravando(false); setSeg(0); };

  const corrigir = (texto: string) => {
    setPrevia((p) => {
      if (!p) return p;
      const d = texto.match(/dia\s+(\d{1,2})/i); const v = texto.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:reais)?$/);
      return { ...p, dia: d ? Number(d[1]) : p.dia, valor: !d && v ? Number(v[1].replace(",", ".")) : p.valor };
    });
  };
  const confirmar = () => {
    if (!previa) return;
    if (previa.intencao === "pagar" && previa.vencimentoId) { alternarPago(previa.vencimentoId, true); flash(`${previa.titulo} marcada como Paga`); }
    if (previa.intencao === "cadastrar") {
      const nova: Conta = {
        id: "nova-" + Date.now(), titulo: previa.titulo!, periodicidade: previa.periodicidade!, dia: previa.dia!, valor: previa.valor,
        etiquetas: previa.etiquetas, inicio: previa.periodicidade === "mensal" ? mes : mes,
        ...(previa.periodicidade === "avulsa" ? { mes: dayjs(mes + "-01").month() + 1, ano: dayjs(mes + "-01").year() } : {}),
      };
      setContas((c) => [...c, nova]); flash(`${nova.titulo} cadastrada · Lembretes criados`);
    }
    setPrevia(null);
  };

  return {
    HOJE, contas, mes, dia, setDia, dir, irMes, irPara, vcal, vref, atras, res, doDia, porDia, alternarPago,
    previa, setPrevia, processando, gravando, seg, iniciarVoz, pararVoz, cancelarVoz, enviarTexto, corrigir, confirmar, toast,
  };
}
export type App = ReturnType<typeof useApp>;

"use client";
// PROTÓTIPO DESCARTÁVEL — peças compartilhadas (ícones, check, linha de Vencimento, Resumo, Comando, Prévia).
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion } from "framer-motion";
import { Button, Drawer, Input, Tooltip } from "antd";
import dayjs from "dayjs";
import {
  AlertTriangle, ArrowRight, Car, Check as CheckIcon, ChevronLeft, ChevronRight, CreditCard, Gamepad2, GraduationCap, HeartPulse,
  Home, Landmark, Mic, Pencil, Repeat, Send, ShieldCheck, Sparkles, Tag, X, Zap, CalendarClock, Square,
} from "lucide-react";
import { MESES, brl } from "@/lib/data";
import type { Resumo } from "@/lib/data";
import type { App } from "@/lib/useApp";
import { LIMITE_VOZ } from "@/lib/useApp";
import type { Etiqueta, Vencimento } from "@/lib/types";

export const ICONE_ETIQUETA: Record<Etiqueta, React.ComponentType<{ size?: number }>> = {
  Moradia: Home, Utilidades: Zap, Transporte: Car, Saúde: HeartPulse, Educação: GraduationCap, Assinaturas: Repeat,
  Cartão: CreditCard, Impostos: Landmark, Seguros: ShieldCheck, Lazer: Gamepad2, Outros: Tag,
};
export const EtiquetaChip = ({ nome, size = "md", late }: { nome: Etiqueta; size?: "sm" | "md"; late?: boolean }) => {
  const I = ICONE_ETIQUETA[nome];
  return (
    <span className={`pill inline-flex items-center gap-1 font-medium ${late ? "bg-[#ffb3b6]/20 text-[#ffd9db]" : "bg-soft text-softink"} ${size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}`}>
      <I size={size === "sm" ? 11 : 13} />{nome}
    </span>
  );
};

/** Hook: número que "conta" até o valor novo. */
export function useCountUp(valor: number) {
  const [v, setV] = useState(valor);
  const ant = useRef(valor);
  useEffect(() => {
    const c = animate(ant.current, valor, { duration: 0.8, ease: "easeOut", onUpdate: setV });
    ant.current = valor;
    return () => c.stop();
  }, [valor]);
  return v;
}
export const Money = ({ v, className }: { v: number; className?: string }) => <span className={className}>{brl(useCountUp(v))}</span>;

/** Check animado (traço desenhado + explosão de partículas). */
export function Check({ pago, atrasado, onChange, size = 32 }: { pago: boolean; atrasado?: boolean; onChange: (p: boolean) => void; size?: number }) {
  return (
    <motion.button
      type="button" aria-label={pago ? "Desmarcar como Pago" : "Marcar como Pago"} aria-pressed={pago}
      onClick={(e) => { e.stopPropagation(); onChange(!pago); }}
      whileTap={{ scale: 0.82 }} whileHover={{ scale: 1.08 }}
      style={{ width: size, height: size }}
      className={`relative grid shrink-0 place-items-center rounded-full border-2 transition-colors ${pago ? "border-lime bg-lime" : atrasado ? "border-[#ffb3b6]" : "border-muted/60"}`}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="var(--lime-ink)" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={false} animate={{ pathLength: pago ? 1 : 0, opacity: pago ? 1 : 0 }} transition={{ duration: 0.28 }} />
      </svg>
      <AnimatePresence>
        {pago && Array.from({ length: 8 }).map((_, i) => (
          <motion.span key={i} className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-lime"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos((i / 8) * 6.283) * size * 0.95, y: Math.sin((i / 8) * 6.283) * size * 0.95, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }} />
        ))}
      </AnimatePresence>
    </motion.button>
  );
}

/** Linha de Vencimento: check, título, Etiquetas (+ valor e marcas de estresse). */
export function VencRow({ v, app, tone = "surface", showDate }: { v: Vencimento; app: App; tone?: "surface" | "plain" | "dark"; showDate?: boolean }) {
  const cruza = v.mesReferencia !== v.dataEfetiva.slice(0, 7);
  const onDark = (tone === "dark" && v.pago) || v.atrasado;
  const ink = onDark ? "text-white" : "text-ink";
  const bg = v.atrasado ? "bg-late text-white" : tone === "dark" && v.pago ? "bg-dark text-white" : tone === "plain" ? "" : "bg-surface";
  return (
    <motion.li layout initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: -24, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className={`group flex items-center gap-3 rounded-[22px] p-3 pr-4 ${bg}`}>
      <Check pago={v.pago} atrasado={v.atrasado} onChange={(p) => app.alternarPago(v.id, p)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`truncate text-[15px] font-semibold ${ink} ${v.pago ? "line-through opacity-60" : ""}`}>{v.titulo}</span>
          {v.atrasado && <span className="pill inline-flex items-center gap-1 bg-white px-2 py-0.5 text-[11px] font-semibold text-[#8f2228]"><AlertTriangle size={11} />Atrasada</span>}
          {v.periodicidade !== "mensal" && <span className={`pill px-2 py-0.5 text-[11px] font-medium ${onDark ? "bg-white/15 text-white" : "bg-surface2 text-body"}`}>{v.periodicidade}</span>}
          {cruza && <span className={`pill inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium ${onDark ? "bg-white/15 text-white" : "bg-surface2 text-body"}`}><CalendarClock size={11} />ref. {MESES[Number(v.mesReferencia.slice(5)) - 1]}</span>}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {v.etiquetas.map((e) => <EtiquetaChip key={e} nome={e} size="sm" late={v.atrasado} />)}
          {showDate && <span className={`text-[11px] ${onDark ? "text-white/70" : "text-muted"}`}>vence {dayjs(v.dataEfetiva).format("DD/MM")}</span>}
        </div>
      </div>
      <div className="text-right">
        {v.valor != null ? <div className={`text-[15px] font-bold tabular-nums ${ink}`}>{brl(v.valor)}</div>
          : <Tooltip title="Sem valor: entra na contagem, não nos totais. Diga “a energia deu 187,40”."><span className={`pill border border-dashed px-2 py-0.5 text-[11px] ${onDark ? "border-white/60 text-white/80" : "border-muted text-muted"}`}>sem valor</span></Tooltip>}
      </div>
    </motion.li>
  );
}

export function AtrasadasBloco({ app }: { app: App }) {
  if (!app.atras.length) return null;
  return (
    <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden">
      <h3 className="mb-3 flex items-center gap-2 text-xl font-extrabold text-ink"><AlertTriangle size={18} className="blink text-danger" />Atrasadas <span className="text-sm font-medium text-muted">{app.atras.length}</span></h3>
      <TimelineDoDia app={app} items={app.atras} late />
    </motion.section>
  );
}

export function ListaDoDia({ app, tone }: { app: App; tone?: "surface" | "plain" | "dark" }) {
  return (
    <div>
      <AnimatePresence initial={false}><AtrasadasBloco app={app} key="atr" /></AnimatePresence>
      <h3 className="mb-2 px-1 text-sm font-semibold text-muted">
        {app.dia === app.HOJE ? "Hoje · " : ""}{dayjs(app.dia).format("dddd, D [de] MMMM").replace(/^./, (c) => c.toUpperCase())}
      </h3>
      <ul className="flex flex-col gap-2">
        <AnimatePresence mode="popLayout" initial={false}>{app.doDia.map((v) => <VencRow key={v.id} v={v} app={app} tone={tone} />)}</AnimatePresence>
      </ul>
      {app.doDia.length === 0 && (
        <motion.div key={app.dia} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid place-items-center gap-2 rounded-[22px] border border-dashed border-line py-8 text-center text-sm text-muted">
          <Sparkles className="float-y" size={22} />Nenhuma Conta vence neste dia.
        </motion.div>
      )}
    </div>
  );
}

export function MonthNav({ app, big }: { app: App; big?: boolean }) {
  const [y, m] = app.mes.split("-").map(Number);
  const btn = "grid h-10 w-10 place-items-center rounded-full bg-surface text-ink hairline transition hover:bg-soft";
  return (
    <div className="flex items-center gap-2">
      <motion.button whileTap={{ scale: 0.88 }} aria-label="Mês anterior" className={btn} onClick={() => app.irMes(-1)}><ChevronLeft size={18} /></motion.button>
      <div className="relative h-10 min-w-[150px] overflow-hidden text-center">
        <AnimatePresence mode="popLayout" custom={app.dir} initial={false}>
          <motion.div key={app.mes} custom={app.dir} initial={{ y: app.dir * 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: app.dir * -24, opacity: 0 }}
            transition={{ duration: 0.22 }} className={`absolute inset-0 flex items-center justify-center font-bold text-ink ${big ? "text-xl" : "text-base"}`}>
            <span className="capitalize">{MESES[m - 1]}</span>&nbsp;<span className="font-medium text-muted">{y}</span>
          </motion.div>
        </AnimatePresence>
      </div>
      <motion.button whileTap={{ scale: 0.88 }} aria-label="Próximo mês" className={btn} onClick={() => app.irMes(1)}><ChevronRight size={18} /></motion.button>
      {app.mes !== app.HOJE.slice(0, 7) && <button className="pill px-3 py-2 text-xs font-semibold text-ink underline" onClick={() => app.irPara(app.HOJE.slice(0, 7), app.HOJE)}>Hoje</button>}
    </div>
  );
}

/** Grade de 6 semanas começando no domingo. */
export function diasDoGrid(mes: string) {
  const ini = dayjs(mes + "-01"); const start = ini.subtract(ini.day(), "day");
  return Array.from({ length: 42 }, (_, i) => start.add(i, "day")).map((d) => ({ iso: d.format("YYYY-MM-DD"), n: d.date(), dentro: d.format("YYYY-MM") === mes, dow: d.day() }));
}

/* ---------- Resumo do mês ---------- */
export function ResumoCard({ app, onOpen, dark = true, big }: { app: App; onOpen: () => void; dark?: boolean; big?: boolean }) {
  const r = app.res; const pct = r.qtd ? (r.qtdPagas / r.qtd) * 100 : 0;
  const base = dark ? "bg-dark text-white" : "bg-surface text-body";
  const a = dark ? "text-darkink" : "text-ink";
  return (
    <motion.button layout whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }} onClick={onOpen} aria-label="Ver todos os Vencimentos do mês"
      className={`w-full rounded-[28px] p-5 text-left ${base}`} style={{ boxShadow: dark ? "var(--shadow-lg)" : undefined }}>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide opacity-80">
        Resumo do mês <span className="inline-flex items-center gap-1 normal-case opacity-90">ver tudo <ArrowRight size={13} /></span>
      </div>
      {r.qtd === 0 ? (
        <div className="py-6 text-center"><Sparkles className={`mx-auto mb-2 float-y ${a}`} /><p className="font-semibold">Mês vazio</p><p className="text-sm opacity-70">Nenhuma Conta com Vencimento neste mês.</p></div>
      ) : (<>
        <div className={`display mt-3 tabular-nums ${a} ${big ? "whitespace-nowrap text-[clamp(34px,11vw,50px)]" : "text-[40px]"}`} style={{ color: dark ? "var(--dark-card-ink)" : undefined }}>
          <Money v={r.aPagar} />
        </div>
        <div className="mt-1 text-sm opacity-80">a pagar{r.atrasadoValor > 0 && <> · <span className={dark ? "font-bold text-[#ffb3b6]" : "font-bold text-danger"}>{brl(r.atrasadoValor)} em atraso</span></>}</div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full" style={{ background: dark ? "rgba(255,255,255,.16)" : "var(--surface-2)" }}>
          <motion.div className="h-full rounded-full bg-lime" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-sm font-semibold"><span>{r.qtdPagas} de {r.qtd} pagas</span><span className="opacity-70">{Math.round(pct)}%</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-2xl p-3" style={{ background: dark ? "rgba(255,255,255,.08)" : "var(--bg)" }}><div className="text-xs opacity-70">Pago</div><b className="tabular-nums">{brl(r.pago)}</b></div>
          <div className="rounded-2xl p-3" style={{ background: dark ? "rgba(255,255,255,.08)" : "var(--bg)" }}><div className="text-xs opacity-70">Total</div><b className="tabular-nums">{brl(r.total)}</b></div>
        </div>
        {r.semValor > 0 && <div className="mt-3 text-xs opacity-75">+{r.semValor} {r.semValor === 1 ? "conta sem valor" : "contas sem valor"}</div>}
      </>)}
    </motion.button>
  );
}

export function ResumoDrawer({ app, open, onClose }: { app: App; open: boolean; onClose: () => void }) {
  const [wide, setWide] = useState(true);
  useEffect(() => { const f = () => setWide(innerWidth >= 768); f(); addEventListener("resize", f); return () => removeEventListener("resize", f); }, []);
  const r: Resumo = app.res; const [, m] = app.mes.split("-").map(Number);
  const grupo = (t: string, xs: Vencimento[]) => (
    <section className="mb-5"><h4 className="mb-2 text-sm font-bold text-ink">{t} · {xs.length}</h4>
      <ul className="flex flex-col gap-2">{xs.map((v) => <VencRow key={v.id} v={v} app={app} showDate />)}</ul></section>
  );
  return (
    <Drawer open={open} onClose={onClose} placement={wide ? "right" : "bottom"} size={wide ? 460 : "78%"} title={`Vencimentos de ${MESES[m - 1]}`}
      styles={{ body: { background: "var(--bg)" }, header: { background: "var(--bg)" } }}>
      {r.qtd === 0 ? <p className="text-muted">Mês vazio.</p> : <>{grupo("A pagar", r.aPagarLista)}{grupo("Pagos", r.pagos)}</>}
    </Drawer>
  );
}

/* ---------- Comando (texto + voz) e Prévia ---------- */
export function Wave({ n = 18 }: { n?: number }) {
  return <div className="flex h-8 items-center gap-[3px]" aria-hidden>{Array.from({ length: n }).map((_, i) => (
    <span key={i} className="wave-bar w-[3px] rounded-full bg-danger" style={{ height: "100%", animationDelay: `${(i % 7) * 0.11}s`, animationDuration: `${0.7 + (i % 5) * 0.12}s` }} />))}</div>;
}

export function CommandInput({ app, autoFocus }: { app: App; autoFocus?: boolean }) {
  const [t, setT] = useState("");
  const enviar = () => { if (t.trim()) { app.enviarTexto(t); setT(""); } };
  const restante = LIMITE_VOZ - app.seg;
  return (
    <div className="flex items-center gap-2">
      <AnimatePresence mode="wait" initial={false}>
        {app.gravando ? (
          <motion.div key="rec" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full bg-dangersoft px-4">
            <span className="blink h-2.5 w-2.5 rounded-full bg-danger" /><span className="text-sm font-bold tabular-nums text-danger">0:{String(app.seg).padStart(2, "0")}</span>
            <div className="hidden min-[380px]:block"><Wave /></div>
            <span className="ml-auto text-xs font-medium text-danger">{restante}s restantes</span>
            <button className="grid h-7 w-7 place-items-center rounded-full text-danger hover:bg-danger/10" aria-label="Cancelar" onClick={app.cancelarVoz}><X size={16} /></button>
          </motion.div>
        ) : (
          <motion.div key="inp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0 flex-1">
            <Input value={t} onChange={(e) => setT(e.target.value)} onPressEnter={enviar} autoFocus={autoFocus} disabled={app.processando}
              placeholder="Ex.: “internet Vivo, 120, todo dia 15” ou “paguei a água”" size="large" variant="outlined"
              style={{ borderRadius: 9999, height: 48, paddingInline: 20 }}
              suffix={<motion.button whileTap={{ scale: 0.85 }} aria-label="Enviar Comando" onClick={enviar} disabled={!t.trim()}
                className={`grid h-8 w-8 place-items-center rounded-full transition ${t.trim() ? "bg-lime text-limeink" : "bg-surface2 text-muted"}`}><Send size={15} /></motion.button>} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative">
        {app.gravando && <><span className="pulse-ring absolute inset-0 rounded-full bg-danger/40" /><span className="pulse-ring absolute inset-0 rounded-full bg-danger/40" style={{ animationDelay: ".5s" }} /></>}
        <motion.button whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.06 }} aria-label={app.gravando ? "Parar gravação" : "Falar um Comando"}
          onClick={app.gravando ? app.pararVoz : app.iniciarVoz} disabled={app.processando}
          className={`relative grid h-12 w-12 place-items-center rounded-full ${app.gravando ? "bg-danger text-white" : "bg-lime text-limeink"}`}>
          {app.gravando ? <Square size={16} fill="currentColor" /> : <Mic size={20} />}
        </motion.button>
      </div>
    </div>
  );
}

export function PreviaCard({ app }: { app: App }) {
  const p = app.previa; const [corrigindo, setCorrigindo] = useState(false); const [c, setC] = useState("");
  useEffect(() => { setCorrigindo(false); setC(""); }, [p?.disse]);
  return (
    <AnimatePresence>
      {(app.processando || p) && (
        <motion.div key={app.processando ? "load" : "prev"} initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }} className="rounded-[28px] bg-bg p-4 hairline" style={{ boxShadow: "var(--shadow-xl)" }}>
          {app.processando ? (
            <div className="flex items-center gap-3 py-2 text-sm font-medium text-ink"><Sparkles className="float-y text-brand" size={18} />Entendendo seu Comando…
              <span className="ml-auto h-2 w-24 rounded-full" style={{ background: "linear-gradient(90deg,var(--surface-2),var(--lime),var(--surface-2))", backgroundSize: "200% 100%", animation: "shimmer 1.2s linear infinite" }} /></div>
          ) : p && (<>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><div className="text-[11px] font-bold uppercase tracking-wide text-muted">Prévia · nada muda até você confirmar</div>
                <p className="mt-1 text-[15px] text-ink">{p.origem === "voz" ? "Você disse" : "Você escreveu"}: <i>“{p.disse}”</i></p></div>
              <button aria-label="Descartar" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface" onClick={() => app.setPrevia(null)}><X size={16} /></button>
            </div>
            {p.intencao === "nao-entendi" ? <p className="mt-3 rounded-2xl bg-surface p-3 text-sm">Não achei essa Conta. Qual delas você quer marcar como Paga?</p> : (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <Campo k="Ação" v={p.intencao === "pagar" ? "Marcar como Pago" : "Cadastrar Conta"} destaque />
                <Campo k="Título" v={p.titulo!} />
                <Campo k="Valor" v={p.valor != null ? brl(p.valor) : "sem valor"} />
                {p.intencao === "cadastrar" && <><Campo k="Periodicidade" v={p.periodicidade!} /><Campo k="Data de vencimento" v={`dia ${p.dia}`} /></>}
                <div className="col-span-2 rounded-2xl bg-surface p-2.5 sm:col-span-1"><dt className="text-[11px] text-muted">Etiquetas</dt><dd className="mt-1 flex flex-wrap gap-1">{p.etiquetas.map((e) => <EtiquetaChip key={e} nome={e} size="sm" />)}</dd></div>
              </dl>)}
            {corrigindo && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 flex gap-2">
                <Input autoFocus value={c} onChange={(e) => setC(e.target.value)} placeholder="Ex.: não, é dia 16" style={{ borderRadius: 9999 }}
                  onPressEnter={() => { app.corrigir(c); setCorrigindo(false); }} />
                <Button shape="round" onClick={() => { app.corrigir(c); setCorrigindo(false); }}>Aplicar</Button>
              </motion.div>)}
            <div className="mt-4 flex items-center gap-3">
              <motion.button whileTap={{ scale: 0.95 }} disabled={p.intencao === "nao-entendi"} onClick={app.confirmar}
                className="pill inline-flex items-center gap-2 bg-lime px-6 py-2.5 text-[15px] font-semibold text-limeink disabled:opacity-40"><CheckIcon size={17} />Confirmar</motion.button>
              <button className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-ink underline underline-offset-4" onClick={() => setCorrigindo((x) => !x)}><Pencil size={14} />Corrigir</button>
            </div>
          </>)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
const Campo = ({ k, v, destaque }: { k: string; v: string; destaque?: boolean }) => (
  <div className={`rounded-2xl p-2.5 ${destaque ? "bg-soft text-softink" : "bg-surface"}`}><dt className="text-[11px] opacity-70">{k}</dt><dd className="font-semibold capitalize-first text-ink" style={destaque ? { color: "var(--soft-ink)" } : undefined}>{v}</dd></div>
);

export const Toast = ({ app }: { app: App }) => (
  <AnimatePresence>{app.toast && (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="pill fixed left-1/2 top-4 z-[60] flex -translate-x-1/2 items-center gap-2 bg-dark px-5 py-2.5 text-sm font-semibold text-darkink" style={{ boxShadow: "var(--shadow-xl)" }}>
      <CheckIcon size={16} />{app.toast}</motion.div>)}</AnimatePresence>
);

/** Linha do tempo do dia (estilo da variante C): usada em B e C. */
export function TimelineDoDia({ app, items, late }: { app: App; items?: Vencimento[]; late?: boolean }) {
  const lista = items ?? app.doDia;
  return (<>
    <ol className="relative flex flex-col gap-3 pl-6 before:absolute before:bottom-3 before:left-[7px] before:top-3 before:w-px before:border-l-2 before:border-dotted before:border-muted/50">
      <AnimatePresence mode="popLayout" initial={false}>
        {lista.map((v, i) => (
          <motion.div key={v.id} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ delay: i * 0.05 }} className="relative">
            <span className={`absolute -left-[22px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-bg ${v.pago ? "bg-lime" : late ? "bg-danger" : "bg-muted"}`} />
            <ul><VencRow v={v} app={app} showDate={late} tone={i === 0 && !late ? "dark" : "surface"} /></ul>
          </motion.div>))}
      </AnimatePresence>
    </ol>
    {lista.length === 0 && <p className="rounded-[22px] border border-dashed border-line py-8 text-center text-sm text-muted">Nenhuma Conta vence neste dia.</p>}
  </>);
}

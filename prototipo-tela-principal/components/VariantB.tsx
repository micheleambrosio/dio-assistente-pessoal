"use client";
// Variante B — "Agenda": Resumo em faixa de 4 números no topo, calendário em largura total com os TÍTULOS
// dentro das células (desktop) ou pontos (mobile), lista do dia ABAIXO do calendário, Comando FLUTUANTE (FAB que expande).
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import { DIAS_SEMANA, MESES, brl } from "@/lib/data";
import type { App } from "@/lib/useApp";
import { AtrasadasBloco, CommandInput, TimelineDoDia, MonthNav, Money, PreviaCard, ResumoDrawer, diasDoGrid } from "./shared";

export default function VariantB({ app }: { app: App }) {
  const [open, setOpen] = useState(false);
  const [y, m] = app.mes.split("-").map(Number); const r = app.res; const pct = r.qtd ? r.qtdPagas / r.qtd : 0;
  const Tile = ({ k, children, tone }: { k: string; children: React.ReactNode; tone?: "lime" | "dark" }) => (
    <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} onClick={() => setOpen(true)}
      className={`rounded-[24px] p-4 text-left ${tone === "lime" ? "bg-lime text-limeink" : tone === "dark" ? "bg-dark text-darkink" : "bg-surface text-ink"}`}>
      <div className="text-xs font-semibold opacity-70">{k}</div><div className="mt-1 text-xl font-extrabold tabular-nums sm:text-2xl">{children}</div></motion.button>);
  return (
    <div className="min-h-dvh bg-bg pb-40 pt-14">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h1 key={app.mes} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.18 }}
              className="display text-[clamp(52px,11vw,120px)] uppercase">{MESES[m - 1]}<span className="ml-3 text-[0.4em] text-muted">{y}</span></motion.h1>
          </AnimatePresence>
          <MonthNav app={app} big />
        </header>

        <section aria-label="Resumo do mês" className="mb-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Tile k="Pago" tone="lime"><Money v={r.pago} /></Tile>
            <Tile k={r.atrasadoValor ? `A pagar · ${brl(r.atrasadoValor)} em atraso` : "A pagar"} tone="dark"><Money v={r.aPagar} /></Tile>
            <Tile k="Total"><Money v={r.total} /></Tile>
            <Tile k="Progresso">
              <div className="flex items-center gap-3">
                <svg width="38" height="38" viewBox="0 0 40 40" className="-rotate-90 shrink-0"><circle cx="20" cy="20" r="16" fill="none" stroke="var(--surface-2)" strokeWidth="6" />
                  <motion.circle cx="20" cy="20" r="16" fill="none" stroke="var(--brand)" strokeWidth="6" strokeLinecap="round" strokeDasharray={100.5} initial={false} animate={{ strokeDashoffset: 100.5 * (1 - pct) }} transition={{ duration: 0.8 }} /></svg>
                <span className="text-sm font-bold leading-tight">{r.qtd ? `${r.qtdPagas} de ${r.qtd} pagas` : "mês vazio"}</span>
              </div>
            </Tile>
          </div>
          {r.semValor > 0 && <p className="mt-2 px-2 text-xs text-muted">+{r.semValor} {r.semValor === 1 ? "conta sem valor" : "contas sem valor"} · toque nos números para ver todos os Vencimentos</p>}
        </section>

        <section className="card p-3 sm:p-5">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted sm:gap-1.5">{DIAS_SEMANA.map((d) => <div key={d} className="pb-1">{d}</div>)}</div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={app.mes} initial={{ opacity: 0, y: app.dir * 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: app.dir * -18 }} transition={{ duration: 0.2 }} className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {diasDoGrid(app.mes).map(({ iso, n, dentro, dow }) => {
                if (!dentro) return <div key={iso} />;
                const vs = app.porDia[iso] ?? []; const atr = vs.some((v) => v.atrasado); const sel = app.dia === iso; const hoje = iso === app.HOJE;
                return (
                  <button key={iso} disabled={!dentro} onClick={() => app.setDia(iso)}
                    className={`relative flex min-h-[54px] flex-col gap-1 overflow-hidden rounded-xl p-1 text-left transition sm:min-h-[104px] sm:rounded-2xl sm:p-2 ${!dentro ? "pointer-events-none opacity-0" : "bg-bg hover:bg-soft"}
                      ${sel ? "ring-2 ring-brand" : ""} ${atr ? "!bg-dangersoft" : ""} ${dow === 0 || dow === 6 ? "opacity-90" : ""}`}>
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold sm:text-sm ${hoje ? "bg-brand text-bg" : "text-ink"}`}>{n}</span>
                    {/* desktop: chips com título */}
                    <span className="hidden flex-col gap-0.5 sm:flex">
                      {vs.slice(0, 2).map((v) => (
                        <span key={v.id} className={`truncate rounded-full px-2 py-0.5 text-[11px] font-semibold ${v.atrasado ? "bg-danger text-white" : v.pago ? (atr ? "paga-no-vermelho line-through" : "bg-surface2 text-muted line-through") : "bg-lime text-limeink"}`}>{v.titulo}</span>))}
                      {vs.length > 2 && <span className="px-1 text-[11px] font-bold text-ink">+{vs.length - 2} contas</span>}
                    </span>
                    {/* mobile: pontos */}
                    <span className="flex flex-wrap gap-[3px] sm:hidden">{vs.slice(0, 6).map((v) => <i key={v.id} className={`h-1.5 w-1.5 rounded-full ${v.atrasado ? "blink bg-danger" : v.pago ? "bg-muted/50" : "bg-brand"}`} />)}</span>
                  </button>);
              })}
            </motion.div>
          </AnimatePresence>
        </section>

        <section className="mt-5 grid gap-5 md:grid-cols-2"><AnimatePresence initial={false}>{app.atras.length > 0 && <div key="a"><AtrasadasBloco app={app} /></div>}</AnimatePresence>
          <div className={app.atras.length ? "" : "md:col-span-2"}>
            <h3 className="mb-3 flex items-baseline gap-2 text-xl font-extrabold text-ink">{app.dia === app.HOJE ? "Hoje" : dayjs(app.dia).format("dddd")} <span className="text-sm font-medium text-muted">{dayjs(app.dia).format("D [de] MMMM")}</span></h3>
            <TimelineDoDia app={app} /></div>
        </section>
      </div>

      <ResumoDrawer app={app} open={open} onClose={() => setOpen(false)} />

      {/* Comando flutuante */}
      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-3 px-4">
        <div className="pointer-events-auto w-full max-w-[640px]"><PreviaCard app={app} /></div>
        <div className="pointer-events-auto w-full max-w-[640px] rounded-full bg-bg p-2 hairline" style={{ boxShadow: "var(--shadow-xl)" }}><CommandInput app={app} /></div>
      </div>
    </div>
  );
}

"use client";
// Variante A — "Painel": segue o rascunho (Draw.png). Calendário grande à esquerda, Resumo + lista à direita,
// entrada de Comando FIXA no rodapé (largura total). Destaque dos dias: célula preenchida + pontos por Vencimento.
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { DIAS_SEMANA, MESES } from "@/lib/data";
import type { App } from "@/lib/useApp";
import { CommandInput, ListaDoDia, MonthNav, PreviaCard, ResumoCard, ResumoDrawer, diasDoGrid } from "./shared";

export default function VariantA({ app }: { app: App }) {
  const [open, setOpen] = useState(false);
  const [y, m] = app.mes.split("-").map(Number);
  return (
    <div className="min-h-dvh bg-bg pb-44 pt-14">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-ink"><span className="grid h-9 w-9 place-items-center rounded-full bg-lime text-limeink"><CalendarDays size={18} /></span><b className="text-lg">Contas do mês</b></div>
          <MonthNav app={app} />
        </header>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          <section className="card p-4 sm:p-7">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1 key={app.mes} initial={{ opacity: 0, x: app.dir * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: app.dir * -30 }} transition={{ duration: 0.2 }}
                className="display mb-5 text-[clamp(40px,8vw,88px)] capitalize">{MESES[m - 1]} <span className="text-muted">{y}</span></motion.h1>
            </AnimatePresence>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted sm:gap-2">{DIAS_SEMANA.map((d) => <div key={d} className="pb-1">{d}</div>)}</div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={app.mes} initial={{ opacity: 0, x: app.dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: app.dir * -40 }} transition={{ duration: 0.2 }} className="grid grid-cols-7 gap-1 sm:gap-2">
                {diasDoGrid(app.mes).map(({ iso, n, dentro }, i) => {
                  if (!dentro) return <div key={iso} />;
                  const vs = app.porDia[iso] ?? []; const atr = vs.some((v) => v.atrasado); const sel = app.dia === iso; const hoje = iso === app.HOJE;
                  return (
                    <motion.button key={iso} disabled={!dentro} onClick={() => app.setDia(iso)} whileTap={{ scale: 0.92 }} whileHover={dentro ? { y: -2 } : undefined}
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.008 }}
                      className={`relative flex aspect-[4/5] flex-col items-center justify-between rounded-2xl p-1.5 text-sm font-semibold transition-colors sm:aspect-[5/4] sm:rounded-3xl sm:p-2.5 lg:aspect-[6/5]
                        ${!dentro ? "pointer-events-none opacity-0" : sel ? "bg-lime text-limeink" : atr ? "bg-dangersoft text-danger" : vs.length ? "bg-soft text-softink" : "bg-bg text-ink"}
                        ${hoje && !sel ? "ring-2 ring-brand" : ""}`}>
                      <span className="self-start text-[13px] sm:text-base">{n}</span>
                      {vs.length > 0 && (
                        <span className="flex items-center gap-[3px]">
                          {vs.slice(0, 4).map((v) => <span key={v.id} className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${v.atrasado ? "blink bg-danger" : v.pago ? "bg-current opacity-30" : "bg-current"}`} />)}
                          {vs.length > 4 && <span className="text-[10px] font-bold">+{vs.length - 4}</span>}
                        </span>)}
                      {vs.length >= 4 && <span className="absolute right-1 top-1 hidden h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-bg sm:right-2 sm:top-2 sm:grid">{vs.length}</span>}
                    </motion.button>);
                })}
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-soft ring-1 ring-line" />tem Vencimento</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-dangersoft ring-1 ring-danger" />tem Atrasado</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-lime" />selecionado</span>
            </div>
          </section>
          <aside className="flex flex-col gap-4">
            <ResumoCard app={app} onOpen={() => setOpen(true)} />
            <div className="lg:max-h-[calc(100dvh-420px)] lg:min-h-[260px] lg:overflow-y-auto lg:pr-1"><ListaDoDia app={app} /></div>
          </aside>
        </div>
      </div>
      <ResumoDrawer app={app} open={open} onClose={() => setOpen(false)} />
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 sm:px-6">
          <PreviaCard app={app} />
          <CommandInput app={app} />
        </div>
      </div>
    </div>
  );
}

"use client";
// Variante C — "Resumo primeiro": Comando como barra no TOPO (estilo busca), Resumo em destaque,
// calendário compacto (faixas contínuas como na Reference-01) e lista do dia como linha do tempo (Reference-02).
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { DIAS_SEMANA, MESES } from "@/lib/data";
import type { App } from "@/lib/useApp";
import { AtrasadasBloco, CommandInput, MonthNav, PreviaCard, ResumoCard, ResumoDrawer, TimelineDoDia, diasDoGrid } from "./shared";
import dayjs from "dayjs";

export default function VariantC({ app }: { app: App }) {
  const [open, setOpen] = useState(false);
  const [y, m] = app.mes.split("-").map(Number);
  const grid = diasDoGrid(app.mes);
  const tem = (iso: string, dentro: boolean) => dentro && (app.porDia[iso]?.length ?? 0) > 0;
  return (
    <div className="min-h-dvh bg-bg pb-10 pt-14">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
        <header className="sticky top-12 z-30 -mx-2 mb-5 rounded-[32px] bg-bg/90 p-2 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-full bg-dark text-darkink sm:grid"><CalendarDays size={20} /></span>
            <div className="min-w-0 flex-1"><CommandInput app={app} /></div>
          </div>
          <div className="mt-2"><PreviaCard app={app} /></div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <ResumoCard app={app} onOpen={() => setOpen(true)} big />
            <div className="hidden lg:block"><AnimatePresence initial={false}><AtrasadasBloco app={app} key="atr" /></AnimatePresence></div>
          </div>

          <div className="flex flex-col gap-5">
            <section className="rounded-[28px] bg-surface p-4 sm:p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <AnimatePresence mode="wait" initial={false}><motion.h2 key={app.mes} initial={{ opacity: 0, x: app.dir * 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  className="text-2xl font-extrabold capitalize text-ink">{MESES[m - 1]} <span className="font-medium text-muted">{y}</span></motion.h2></AnimatePresence>
                <MonthNav app={app} />
              </div>
              <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase text-muted">{DIAS_SEMANA.map((d) => <div key={d} className="pb-2">{d}</div>)}</div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={app.mes} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.18 }} className="grid grid-cols-7 gap-y-1">
                  {grid.map(({ iso, n, dentro, dow }, i) => {
                    const vs = app.porDia[iso] ?? []; const has = tem(iso, dentro); const sel = app.dia === iso; const atr = vs.some((v) => v.atrasado);
                    const L = has && dow !== 0 && tem(grid[i - 1]?.iso, grid[i - 1]?.dentro); const R = has && dow !== 6 && tem(grid[i + 1]?.iso, grid[i + 1]?.dentro);
                    return (
                      <div key={iso} className={`relative p-0 ${has ? "bg-soft" : ""} ${has && !L ? "rounded-l-full" : ""} ${has && !R ? "rounded-r-full" : ""}`}>
                        <button disabled={!dentro} onClick={() => app.setDia(iso)} aria-label={`Dia ${n}`}
                          className={`relative mx-auto grid h-11 w-11 place-items-center rounded-full text-sm font-bold transition sm:h-14 sm:w-14 sm:text-base
                            ${!dentro ? "pointer-events-none opacity-0" : sel ? "bg-brand text-bg" : atr ? "text-danger ring-2 ring-danger" : iso === app.HOJE ? "ring-2 ring-brand text-ink" : has ? "text-softink" : "text-ink hover:bg-surface2"}`}>
                          {sel && <motion.span layoutId="selC" className="absolute inset-0 -z-0 rounded-full bg-brand" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
                          <span className="relative">{n}</span>
                          {vs.length > 1 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-lime px-1 text-[9px] font-extrabold text-limeink">{vs.length}</span>}
                        </button>
                      </div>);
                  })}
                </motion.div>
              </AnimatePresence>
            </section>

            <section>
              <div className="lg:hidden"><AnimatePresence initial={false}><AtrasadasBloco app={app} key="atr" /></AnimatePresence></div>
              <h3 className="mb-3 flex items-baseline gap-2 text-xl font-extrabold text-ink">
                {app.dia === app.HOJE ? "Hoje" : dayjs(app.dia).format("dddd")} <span className="text-sm font-medium text-muted">{dayjs(app.dia).format("D [de] MMMM")}</span>
              </h3>
              <TimelineDoDia app={app} />
            </section>
          </div>
        </div>
      </div>
      <ResumoDrawer app={app} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

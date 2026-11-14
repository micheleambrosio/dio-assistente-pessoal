"use client";

import { Drawer } from "antd";
import { useEffect, useRef, useState } from "react";
import type { Occurrence } from "@/core/domain";
import type { MonthSummary as Summary } from "@/core/month-summary";
import { formatMoney } from "@/lib/money";
import { OccurrenceRow } from "./OccurrenceRow";

/** Conta de 0 até o valor (e de um valor ao outro) em ~700 ms; sem animação se o Usuário prefere menos movimento. */
function useCountUp(target: number) {
  const [shown, setShown] = useState(target);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min((now - start) / 700, 1);
      const value = origin + (target - origin) * (1 - (1 - t) ** 3);
      setShown(value);
      from.current = value;
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return shown;
}

function Money({ value }: { value: number }) {
  return <>{formatMoney(useCountUp(value))}</>;
}

function Count({ value }: { value: number }) {
  return <>{Math.round(useCountUp(value))}</>;
}

/** Resumo do mês: Pago, A pagar (com o valor em atraso), Total e Progresso. Tocar abre os Vencimentos do mês. */
export function MonthSummary({ summary, occurrences }: { summary: Summary; occurrences: Occurrence[] }) {
  const [open, setOpen] = useState(false);
  const { paidTotal, toPayTotal, overdueTotal, total, paidCount, count, withoutAmountCount } = summary;
  const ratio = count ? paidCount / count : 0;
  const [fill, setFill] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setFill(ratio));
    return () => cancelAnimationFrame(id);
  }, [ratio]);

  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const tile = "min-w-0 cursor-pointer flex flex-col rounded-[24px] p-4 text-left transition duration-200 hover:-translate-y-[3px] active:scale-[0.97] motion-reduce:transition-none";
  const caption = "text-xs font-semibold opacity-70";
  const value = "mt-1 text-xl font-extrabold tabular-nums sm:text-2xl";
  const openDrawer = () => setOpen(true);

  return (
    <>
      {count === 0 ? (
        <button type="button" onClick={openDrawer} aria-label="Resumo do mês: ver os Vencimentos do mês" className={`${tile} items-center bg-surface text-muted`}>
          <span className="text-sm font-semibold">Mês vazio</span>
        </button>
      ) : (
        <section aria-label="Resumo do mês">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <button type="button" onClick={openDrawer} className={`${tile} bg-lime text-limeink`}>
              <span className={caption}>Pago</span>
              <span className={value}><Money value={paidTotal} /></span>
            </button>
            <button type="button" onClick={openDrawer} className={`${tile} bg-dark text-darkink`}>
              <span className={caption}>{overdueTotal > 0 ? `A pagar · ${formatMoney(overdueTotal)} em atraso` : "A pagar"}</span>
              <span className={value}><Money value={toPayTotal} /></span>
            </button>
            <button type="button" onClick={openDrawer} className={`${tile} bg-surface text-ink`}>
              <span className={caption}>Total</span>
              <span className={value}><Money value={total} /></span>
            </button>
            <button type="button" onClick={openDrawer} className={`${tile} bg-surface text-ink`}>
              <span className={caption}>Progresso</span>
              <span className="mt-1 flex items-center gap-3">
                <svg
                  role="progressbar"
                  aria-label="Progresso do mês"
                  aria-valuemin={0}
                  aria-valuemax={count}
                  aria-valuenow={paidCount}
                  width="38"
                  height="38"
                  viewBox="0 0 40 40"
                  className="-rotate-90 shrink-0"
                >
                  <circle cx="20" cy="20" r="16" fill="none" stroke="var(--surface-2)" strokeWidth="6" />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={100.5}
                    strokeDashoffset={100.5 * (1 - fill)}
                    className="transition-[stroke-dashoffset] duration-[800ms] ease-out motion-reduce:transition-none"
                  />
                </svg>
                <span className="text-sm font-bold leading-tight">
                  <Count value={paidCount} /> de {count} {count === 1 ? "paga" : "pagas"}
                </span>
              </span>
            </button>
          </div>
          <p className="mt-2 px-2 text-xs text-muted">
            {withoutAmountCount > 0 && (
              <>+{withoutAmountCount} {withoutAmountCount === 1 ? "conta sem valor" : "contas sem valor"} · </>
            )}
            toque nos números para ver todos os Vencimentos
          </p>
        </section>
      )}
      <Drawer
        title="Vencimentos do mês"
        open={open}
        onClose={() => setOpen(false)}
        placement={wide ? "right" : "bottom"}
        width={wide ? 460 : undefined}
        height={wide ? undefined : "78%"}
        styles={{ body: { background: "var(--bg)" }, header: { background: "var(--bg)" } }}
      >
        {occurrences.length === 0 ? (
          <p className="text-sm text-muted">Mês vazio</p>
        ) : (
          <div className="flex flex-col gap-6">
            <DrawerList title="A pagar" items={occurrences.filter((o) => !o.isPaid)} empty="Nada a pagar neste mês" />
            <DrawerList title="Pagos" items={occurrences.filter((o) => o.isPaid)} empty="Nenhuma Conta paga ainda" />
          </div>
        )}
      </Drawer>
    </>
  );
}

/** Os mesmos cartões da lista do dia, com o check: dá para marcar e desmarcar daqui. */
function DrawerList({ title, items, empty }: { title: string; items: Occurrence[]; empty: string }) {
  return (
    <section aria-label={title}>
      <h4 className="mb-2 text-sm font-bold text-ink">{title} · {items.length}</h4>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((o) => (
            <OccurrenceRow key={o.billId + o.referenceMonth} occurrence={o} showDate />
          ))}
        </ul>
      )}
    </section>
  );
}

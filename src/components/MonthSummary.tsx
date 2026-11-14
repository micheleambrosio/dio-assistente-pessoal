"use client";

import { Drawer } from "antd";
import { useEffect, useRef, useState } from "react";
import type { Occurrence } from "@/core/domain";
import type { MonthSummary as Summary } from "@/core/month-summary";
import { formatDate, formatMoney } from "@/lib/labels";

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

  const label = "text-[11px] font-semibold uppercase tracking-wide text-muted";
  const number = "text-xl font-extrabold tabular-nums text-ink sm:text-2xl";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Resumo do mês: ver os Vencimentos do mês"
        className="w-full rounded-[28px] bg-surface p-4 text-left transition hover:brightness-95 sm:p-5"
      >
        {count === 0 ? (
          <p className="text-center text-sm font-semibold text-muted">Mês vazio</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <div>
                <dt className={label}>Pago</dt>
                <dd className={number}><Money value={paidTotal} /></dd>
              </div>
              <div>
                <dt className={label}>A pagar</dt>
                <dd className={number}><Money value={toPayTotal} /></dd>
                {overdueTotal > 0 && <dd className="text-xs font-semibold text-danger">{formatMoney(overdueTotal)} em atraso</dd>}
              </div>
              <div>
                <dt className={label}>Total</dt>
                <dd className={number}><Money value={total} /></dd>
              </div>
              <div>
                <dt className={label}>Progresso</dt>
                <dd className={number}>
                  <Count value={paidCount} /> de {count} {count === 1 ? "paga" : "pagas"}
                </dd>
              </div>
            </dl>
            <div
              role="progressbar"
              aria-label="Progresso do mês"
              aria-valuemin={0}
              aria-valuemax={count}
              aria-valuenow={paidCount}
              className="mt-3 h-2 overflow-hidden rounded-full bg-surface2"
            >
              <div className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${fill * 100}%` }} />
            </div>
            {withoutAmountCount > 0 && (
              <p className="mt-2 text-xs text-muted">
                +{withoutAmountCount} {withoutAmountCount === 1 ? "conta sem valor" : "contas sem valor"}
              </p>
            )}
          </>
        )}
      </button>
      <Drawer title="Contas do mês" open={open} onClose={() => setOpen(false)} placement="right" width={420}>
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

function DrawerList({ title, items, empty }: { title: string; items: Occurrence[]; empty: string }) {
  return (
    <section aria-label={title}>
      <h3 className="mb-2 text-sm font-extrabold text-ink">{title} <span className="font-medium text-muted">{items.length}</span></h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((o) => (
            <li key={o.billId + o.referenceMonth} className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className={`block truncate font-semibold ${o.isOverdue ? "text-danger" : "text-ink"}`}>{o.title}</span>
                <span className="text-xs text-muted">{formatDate(o.effectiveDate).slice(0, 5)}{o.isOverdue && " · atrasada"}</span>
              </span>
              <span className="font-bold tabular-nums text-ink">{o.amount !== undefined ? formatMoney(o.amount) : "sem valor"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

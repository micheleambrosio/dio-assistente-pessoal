import type { Occurrence } from "@/core/domain";
import { RECURRENCE_LABELS, TAG_LABELS, formatMoney } from "@/lib/labels";
import { monthLabel } from "@/lib/month";

const badge = "rounded-full bg-surface px-2 py-0.5 text-xs";

/** Vencimentos do dia selecionado, em linha do tempo. O check ainda não tem ação. */
export function DayTimeline({ date, occurrences }: { date: string; occurrences: Occurrence[] }) {
  const day = Number(date.slice(8));
  const { name } = monthLabel(date.slice(0, 7));

  return (
    <section aria-label={`Contas do dia ${day} de ${name}`}>
      <h2 className="mb-3 text-lg font-bold">{day} de {name}</h2>
      {occurrences.length === 0 ? (
        <p className="text-muted">Nenhuma Conta vence neste dia</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {occurrences.map((o) => (
            <li key={o.billId + o.dueDate} className="flex items-center gap-3 rounded-[10px] border border-line p-3">
              <span aria-hidden className="inline-flex size-6 shrink-0 rounded-full border-2 border-line" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{o.title}</p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {o.tags.map((t) => <span key={t} className={badge}>{TAG_LABELS[t]}</span>)}
                  {o.recurrence !== "monthly" && <span className={badge}>{RECURRENCE_LABELS[o.recurrence]}</span>}
                  {o.referenceMonth !== date.slice(0, 7) && (
                    <span className={badge}>ref. {monthLabel(o.referenceMonth).name}</span>
                  )}
                </p>
              </div>
              {o.amount !== undefined ? (
                <span className="font-semibold">{formatMoney(o.amount)}</span>
              ) : (
                <span className="rounded-full border border-dashed border-muted px-2 py-0.5 text-xs text-muted">sem valor</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import type { Occurrence } from "@/core/domain";
import { RECURRENCE_LABELS, TAG_LABELS, formatMoney } from "@/lib/labels";
import { monthLabel } from "@/lib/month";

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

/** Vencimentos do dia selecionado, em linha do tempo. O check ainda não tem ação. */
export function DayTimeline({ date, today, occurrences }: { date: string; today: string; occurrences: Occurrence[] }) {
  const day = Number(date.slice(8));
  const { name } = monthLabel(date.slice(0, 7));
  const weekday = WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];

  return (
    <section aria-label={`Contas do dia ${day} de ${name}`}>
      <h2 className="mb-3 flex items-baseline gap-2 text-xl font-extrabold text-ink">
        {date === today ? "Hoje" : weekday}
        <span className="text-sm font-medium text-muted">{day} de {name}</span>
      </h2>
      {occurrences.length === 0 ? (
        <p className="grid place-items-center rounded-[22px] border border-dashed border-line py-8 text-center text-sm text-muted">
          Nenhuma Conta vence neste dia
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {occurrences.map((o) => (
            <Row key={o.billId + o.dueDate} occurrence={o} month={date.slice(0, 7)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({ occurrence: o, month }: { occurrence: Occurrence; month: string }) {
  const late = o.isOverdue;
  const pill = (extra: string) => `rounded-full px-2 py-0.5 text-[11px] font-medium ${extra}`;
  const neutral = pill(late ? "bg-white/15 text-white" : "bg-surface2 text-body");

  return (
    <li className={`flex items-center gap-3 rounded-[22px] p-3 pr-4 ${late ? "bg-late text-white" : "bg-surface"}`}>
      <span
        aria-hidden
        className={`grid size-8 shrink-0 place-items-center rounded-full border-2 ${
          o.isPaid ? "border-lime bg-lime" : late ? "border-[#ffb3b6]" : "border-muted/60"
        }`}
      >
        {o.isPaid && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#163300" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`truncate text-[15px] font-semibold ${late ? "text-white" : "text-ink"} ${o.isPaid ? "line-through opacity-60" : ""}`}>
            {o.title}
          </span>
          {late && <span className={pill("bg-white font-semibold text-late")}>Atrasada</span>}
          {o.recurrence !== "monthly" && <span className={neutral}>{RECURRENCE_LABELS[o.recurrence]}</span>}
          {o.referenceMonth !== month && <span className={neutral}>ref. {monthLabel(o.referenceMonth).name}</span>}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {o.tags.map((t) => (
            <span key={t} className={pill(late ? "bg-[#ffb3b6]/20 text-[#ffd9db]" : "bg-soft text-softink")}>
              {TAG_LABELS[t]}
            </span>
          ))}
        </div>
      </div>
      {o.amount !== undefined ? (
        <span className={`text-[15px] font-bold tabular-nums ${late ? "text-white" : "text-ink"}`}>{formatMoney(o.amount)}</span>
      ) : (
        <span className={`rounded-full border border-dashed px-2 py-0.5 text-[11px] ${late ? "border-white/60 text-white/80" : "border-muted text-muted"}`}>
          sem valor
        </span>
      )}
    </li>
  );
}

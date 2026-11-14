import type { Occurrence } from "@/core/domain";
import { monthLabel } from "@/lib/month";
import { OccurrenceRow } from "./OccurrenceRow";
import { Timeline, TimelineItem } from "./Timeline";

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

/** Vencimentos do dia selecionado, em linha do tempo. Todo Pago fica em cartão forest. */
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
        <Timeline>
          {occurrences.map((o, i) => (
            <TimelineItem key={o.billId + o.referenceMonth} index={i} dot={o.isPaid ? "paid" : o.isOverdue ? "late" : "open"}>
              <OccurrenceRow occurrence={o} />
            </TimelineItem>
          ))}
        </Timeline>
      )}
    </section>
  );
}

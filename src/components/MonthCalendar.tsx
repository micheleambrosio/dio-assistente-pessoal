import Link from "next/link";
import type { Occurrence } from "@/core/domain";
import { monthWeeks } from "@/lib/month";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

type Props = {
  month: string;
  today: string;
  selected: string;
  days: Record<string, Occurrence[]>;
};

export function MonthCalendar({ month, today, selected, days }: Props) {
  const weeks = monthWeeks(month);

  return (
    <section aria-label="Calendário" className="w-full overflow-hidden rounded-[10px] border border-line">
      <div className="grid grid-cols-7 bg-surface text-center text-xs font-semibold uppercase text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>
      {weeks.map((week, i) => (
        <div key={i} className="grid grid-cols-7">
          {week.map((day, j) => {
            if (!day) return <div key={j} className="min-h-14 border-t border-l border-line first:border-l-0 sm:min-h-24" />;
            const date = `${month}-${String(day).padStart(2, "0")}`;
            const occurrences = days[date] ?? [];
            const isToday = date === today;
            return (
              <Link
                key={j}
                href={`/?m=${month}&d=${date}`}
                scroll={false}
                aria-label={`Dia ${day}${occurrences.length ? `, ${occurrences.length} ${occurrences.length === 1 ? "Conta" : "Contas"}` : ""}`}
                aria-current={date === selected ? "date" : undefined}
                className={`flex min-h-14 flex-col gap-1 border-t border-l border-line p-1.5 first:border-l-0 sm:min-h-24 sm:p-2 ${date === selected ? "bg-linen text-forest" : ""}`}
              >
                <span
                  className={
                    isToday
                      ? "inline-flex size-7 items-center justify-center rounded-full bg-lime text-sm font-semibold text-forest"
                      : "inline-flex size-7 items-center justify-center text-sm"
                  }
                >
                  {day}
                </span>
                {/* Desktop: até 2 chips e "+N contas". */}
                <div className="hidden flex-col gap-1 sm:flex">
                  {occurrences.slice(0, 2).map((o) => (
                    <span key={o.billId + o.dueDate} className="truncate rounded bg-forest px-1.5 py-0.5 text-xs text-white">{o.title}</span>
                  ))}
                  {occurrences.length > 2 && <span className="text-xs text-muted">+{occurrences.length - 2} contas</span>}
                </div>
                {/* Mobile: pontos. */}
                <div className="flex gap-0.5 sm:hidden" aria-hidden>
                  {occurrences.slice(0, 4).map((o) => (
                    <span key={o.billId + o.dueDate} className="size-1.5 rounded-full bg-forest" />
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      ))}
    </section>
  );
}

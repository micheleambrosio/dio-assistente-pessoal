import { NavLink } from "./NavigationProvider";
import type { Occurrence } from "@/core/domain";
import { monthWeeks } from "@/lib/month";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

type Props = {
  month: string;
  today: string;
  selected: string;
  days: Record<string, Occurrence[]>;
};

function chipStyle(o: Occurrence, dayHasOverdue: boolean) {
  if (o.isOverdue) return "bg-danger text-white";
  if (o.isPaid) return dayHasOverdue ? "bg-white text-[#3a3c3a] line-through dark:bg-surface2 dark:text-muted" : "bg-surface2 text-muted line-through";
  return "bg-lime text-limeink";
}

function dotStyle(o: Occurrence) {
  if (o.isOverdue) return "blink bg-danger";
  return o.isPaid ? "bg-muted/50" : "bg-brand";
}

export function MonthCalendar({ month, today, selected, days }: Props) {
  const weeks = monthWeeks(month);

  return (
    <section aria-label="Calendário" className="rounded-[28px] bg-surface p-3 sm:p-5">
      <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-semibold uppercase text-muted sm:gap-1.5">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {weeks.flat().map((day, i) => {
          if (!day) return <div key={i} />;
          const date = `${month}-${String(day).padStart(2, "0")}`;
          const occurrences = days[date] ?? [];
          const hasOverdue = occurrences.some((o) => o.isOverdue);
          const label = occurrences.length ? `, ${occurrences.length} ${occurrences.length === 1 ? "Conta" : "Contas"}` : "";
          return (
            <NavLink
              key={i}
              href={`/?m=${month}&d=${date}`}
              scroll={false}
              aria-label={`Dia ${day}${label}`}
              aria-current={date === selected ? "date" : undefined}
              className={`flex min-h-[54px] flex-col gap-1 overflow-hidden rounded-xl p-1 transition sm:min-h-[104px] sm:rounded-2xl sm:p-2 ${
                hasOverdue ? "bg-dangersoft" : "bg-bg hover:bg-soft"
              } ${date === selected ? "ring-2 ring-brand" : ""}`}
            >
              <span
                className={`grid size-6 place-items-center rounded-full text-[12px] font-bold sm:text-sm ${
                  date === today ? "bg-brand text-bg" : "text-ink"
                }`}
              >
                {day}
              </span>
              {/* Desktop: até 2 chips e "+N contas". */}
              <span className="hidden flex-col gap-0.5 sm:flex">
                {occurrences.slice(0, 2).map((o) => (
                  <span
                    key={o.billId + o.referenceMonth}
                    className={`truncate rounded-full px-2 py-0.5 text-[11px] font-semibold ${chipStyle(o, hasOverdue)}`}
                  >
                    {o.title}
                  </span>
                ))}
                {occurrences.length > 2 && (
                  <span className="px-1 text-[11px] font-bold text-ink">+{occurrences.length - 2} contas</span>
                )}
              </span>
              {/* Mobile: pontos. */}
              <span className="flex flex-wrap gap-[3px] sm:hidden" aria-hidden>
                {occurrences.slice(0, 6).map((o) => (
                  <i key={o.billId + o.referenceMonth} className={`size-1.5 rounded-full ${dotStyle(o)}`} />
                ))}
              </span>
            </NavLink>
          );
        })}
      </div>
    </section>
  );
}

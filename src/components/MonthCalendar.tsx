import { monthWeeks } from "@/lib/month";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function MonthCalendar({ month, today }: { month: string; today: string }) {
  const weeks = monthWeeks(month);
  const todayDay = today.startsWith(month) ? Number(today.slice(8)) : null;

  return (
    <section aria-label="Calendário" className="w-full overflow-hidden rounded-[10px] border border-line">
      <div className="grid grid-cols-7 bg-surface text-center text-xs font-semibold uppercase text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>
      {weeks.map((week, i) => (
        <div key={i} className="grid grid-cols-7">
          {week.map((day, j) => (
            <div key={j} className="min-h-14 border-t border-l border-line p-1.5 first:border-l-0 sm:min-h-24 sm:p-2">
              {day && (
                <span
                  className={
                    day === todayDay
                      ? "inline-flex size-7 items-center justify-center rounded-full bg-lime text-sm font-semibold text-forest"
                      : "inline-flex size-7 items-center justify-center text-sm"
                  }
                >
                  {day}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

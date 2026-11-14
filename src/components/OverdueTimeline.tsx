import type { Occurrence } from "@/core/domain";
import { OccurrenceRow } from "./OccurrenceRow";

/** Atrasadas: global, na mesma estrutura do dia. Só existe enquanto há algum Atrasado. */
export function OverdueTimeline({ occurrences }: { occurrences: Occurrence[] }) {
  if (occurrences.length === 0) return null;
  return (
    <section aria-label="Atrasadas">
      <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold text-ink">
        <svg aria-hidden className="blink size-5 text-danger" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.5 1.8 20.5h20.4L12 2.5Zm-1 7h2v5h-2v-5Zm0 6.5h2v2h-2v-2Z" />
        </svg>
        Atrasadas
        <span className="text-sm font-medium text-muted">{occurrences.length}</span>
      </h2>
      <ul className="flex flex-col gap-2">
        {occurrences.map((o) => (
          <OccurrenceRow key={o.billId + o.referenceMonth} occurrence={o} showDate />
        ))}
      </ul>
    </section>
  );
}

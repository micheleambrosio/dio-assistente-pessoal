/** Esqueleto do mês enquanto os Vencimentos carregam. */
export function MonthSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando o mês" className="flex animate-pulse flex-col gap-4">
      <div className="rounded-[28px] bg-surface p-3 sm:p-5">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="min-h-[54px] rounded-xl bg-bg sm:min-h-[104px] sm:rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 rounded-full bg-surface" />
        <div className="h-16 rounded-[22px] bg-surface" />
      </div>
    </div>
  );
}

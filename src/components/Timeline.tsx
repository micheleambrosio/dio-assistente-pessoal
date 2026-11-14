/** Linha do tempo vertical (linha pontilhada e um ponto por Vencimento), como no protótipo. */
export function Timeline({ children }: { children: React.ReactNode }) {
  return (
    <ol className="relative flex flex-col gap-3 pl-6 before:absolute before:bottom-3 before:left-[7px] before:top-3 before:w-px before:border-l-2 before:border-dotted before:border-muted/50">
      {children}
    </ol>
  );
}

const DOTS = { paid: "bg-lime", late: "bg-danger", open: "bg-muted" } as const;

export function TimelineItem({ dot, index, children }: { dot: keyof typeof DOTS; index: number; children: React.ReactNode }) {
  return (
    <li className="timeline-in relative min-w-0" style={{ animationDelay: `${index * 50}ms` }}>
      <span aria-hidden className={`absolute -left-[22px] top-1/2 size-3.5 -translate-y-1/2 rounded-full border-2 border-bg ${DOTS[dot]}`} />
      <ul>{children}</ul>
    </li>
  );
}

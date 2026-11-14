"use client";

import { NavLink } from "./NavigationProvider";

const nav =
  "hairline inline-flex size-10 items-center justify-center rounded-full bg-surface font-semibold text-ink transition hover:bg-soft";

export function MonthNav({ previous, next }: { previous: string; next: string }) {
  return (
    <nav aria-label="Navegação de mês" className="flex items-center gap-2">
      <NavLink href={`/?m=${previous}`} className={nav} aria-label="Mês anterior">←</NavLink>
      <NavLink href="/" className="rounded-full px-3 py-2 text-xs font-semibold text-ink underline">Hoje</NavLink>
      <NavLink href={`/?m=${next}`} className={nav} aria-label="Próximo mês">→</NavLink>
    </nav>
  );
}

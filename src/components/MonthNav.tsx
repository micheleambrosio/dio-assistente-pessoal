"use client";

import Link, { useLinkStatus } from "next/link";
import { Spinner } from "./Spinner";

const nav =
  "hairline inline-flex size-10 items-center justify-center rounded-full bg-surface font-semibold text-ink transition hover:bg-soft";

/** Mostra o spinner no lugar do conteúdo do link enquanto a navegação carrega. */
function LinkContent({ children, label }: { children: React.ReactNode; label: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner label={label} /> : <>{children}</>;
}

export function MonthNav({ previous, next }: { previous: string; next: string }) {
  return (
    <nav aria-label="Navegação de mês" className="flex items-center gap-2">
      <Link href={`/?m=${previous}`} className={nav} aria-label="Mês anterior">
        <LinkContent label="Carregando o mês anterior">←</LinkContent>
      </Link>
      <Link href="/" className="rounded-full px-3 py-2 text-xs font-semibold text-ink underline">
        <LinkContent label="Carregando o mês atual">Hoje</LinkContent>
      </Link>
      <Link href={`/?m=${next}`} className={nav} aria-label="Próximo mês">
        <LinkContent label="Carregando o próximo mês">→</LinkContent>
      </Link>
    </nav>
  );
}

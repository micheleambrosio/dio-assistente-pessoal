import Link from "next/link";
import { CommandBar } from "@/components/command-bar";
import { MonthCalendar } from "@/components/month-calendar";
import { SaoPauloClock } from "@/core/clock";
import { isMonth, monthLabel, shiftMonth } from "@/lib/month";

export default async function Home({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const clock = new SaoPauloClock();
  const { m } = await searchParams;
  const month = isMonth(m) ? m : clock.currentMonth();
  const { name, year } = monthLabel(month);

  const nav = "inline-flex size-10 items-center justify-center rounded-full bg-surface font-semibold";

  return (
    <>
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pt-6 pb-28">
        <header className="flex items-end justify-between gap-4">
          <h1 className="text-5xl font-black uppercase leading-none tracking-tight sm:text-7xl">
            {name} <span className="text-muted">{year}</span>
          </h1>
          <nav aria-label="Navegação de mês" className="flex items-center gap-2">
            <Link href={`/?m=${shiftMonth(month, -1)}`} className={nav} aria-label="Mês anterior">←</Link>
            <Link href="/" className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-forest">Hoje</Link>
            <Link href={`/?m=${shiftMonth(month, 1)}`} className={nav} aria-label="Próximo mês">→</Link>
          </nav>
        </header>
        <MonthCalendar month={month} today={clock.today()} />
      </main>
      <CommandBar />
    </>
  );
}

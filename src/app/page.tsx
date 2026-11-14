import Link from "next/link";
import { CommandBar } from "@/components/command-bar";
import { MonthCalendar } from "@/components/month-calendar";
import { SaoPauloClock } from "@/core/clock";
import { ensureBillsCalendar } from "@/core/ensure-bills-calendar";
import { GoogleCalendarGateway } from "@/infra/google-calendar-gateway";
import { createUserClient } from "@/infra/supabase";
import { SupabaseRepository } from "@/infra/supabase-repository";
import { isMonth, monthLabel, shiftMonth } from "@/lib/month";

export default async function Home({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const clock = new SaoPauloClock();
  const { m } = await searchParams;
  const month = isMonth(m) ? m : clock.currentMonth();
  const { name, year } = monthLabel(month);

  const calendarFailed = await retryMissingBillsCalendar();

  const nav = "inline-flex size-10 items-center justify-center rounded-full bg-surface font-semibold";

  return (
    <>
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pt-6 pb-28">
        {calendarFailed && (
          <p role="alert" className="rounded-[10px] bg-surface px-4 py-3 text-sm">
            Não conseguimos criar a agenda &quot;Contas do mês&quot; no seu Google Calendar.{" "}
            <Link href="/login" className="font-semibold underline">Entre de novo com o Google</Link> para tentar outra vez.
          </p>
        )}
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

/** Se o login não conseguiu criar a Agenda de contas, tenta de novo ao abrir o app. true = falhou. */
async function retryMissingBillsCalendar() {
  const supabase = await createUserClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;

  const repository = new SupabaseRepository(supabase);
  if (await repository.getBillsCalendarId(data.user.id)) return false;

  try {
    await ensureBillsCalendar({ repository, calendar: new GoogleCalendarGateway() }, data.user.id);
    return false;
  } catch (e) {
    console.error("Falha ao criar a Agenda de contas", e);
    return true;
  }
}

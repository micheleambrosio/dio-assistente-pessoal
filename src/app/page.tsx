import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { CommandBar } from "@/components/CommandBar";
import { DayTimeline } from "@/components/DayTimeline";
import { MonthCalendar } from "@/components/MonthCalendar";
import { SaoPauloClock } from "@/core/clock";
import { getMonth } from "@/core/commands";
import { ensureBillsCalendar } from "@/core/ensure-bills-calendar";
import { GoogleCalendarGateway } from "@/infra/google-calendar-gateway";
import { createUserClient } from "@/infra/supabase";
import { SupabaseRepository } from "@/infra/supabase-repository";
import { isMonth, monthLabel, shiftMonth } from "@/lib/month";

export default async function Home({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const clock = new SaoPauloClock();
  const { m, d } = await searchParams;
  const month = isMonth(m) ? m : clock.currentMonth();
  const { name, year } = monthLabel(month);

  const calendarFailed = await retryMissingBillsCalendar();
  const days = await loadMonth(month, clock);
  const today = clock.today();
  const selected = d?.startsWith(month) && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today.startsWith(month) ? today : `${month}-01`;

  const nav = "hairline inline-flex size-10 items-center justify-center rounded-full bg-surface font-semibold text-ink transition hover:bg-soft";

  return (
    <>
      <main className="mx-auto flex min-h-dvh max-w-[1200px] flex-col gap-4 px-4 pt-14 pb-44 sm:px-6">
        {calendarFailed && (
          <p role="alert" className="rounded-[22px] bg-surface px-4 py-3 text-sm">
            Não conseguimos criar a agenda &quot;Contas do mês&quot; no seu Google Calendar.{" "}
            <Link href="/login" className="font-semibold underline">Entre de novo com o Google</Link> e, na tela de consentimento, marque a permissão do Google Calendar.
          </p>
        )}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="display text-[clamp(52px,11vw,120px)] uppercase">
            {name} <span className="ml-1 text-[0.4em] text-muted">{year}</span>
          </h1>
          <div className="flex items-center gap-2">
            <nav aria-label="Navegação de mês" className="flex items-center gap-2">
              <Link href={`/?m=${shiftMonth(month, -1)}`} className={nav} aria-label="Mês anterior">←</Link>
              <Link href="/" className="rounded-full px-3 py-2 text-xs font-semibold text-ink underline">Hoje</Link>
              <Link href={`/?m=${shiftMonth(month, 1)}`} className={nav} aria-label="Próximo mês">→</Link>
            </nav>
            <AccountMenu />
          </div>
        </header>
        <MonthCalendar month={month} today={today} selected={selected} days={days} />
        <div className="mt-1">
          <DayTimeline date={selected} today={today} occurrences={days[selected] ?? []} />
        </div>
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

async function loadMonth(month: string, clock: SaoPauloClock) {
  const supabase = await createUserClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return {};
  const repository = new SupabaseRepository(supabase);
  return (await getMonth({ repository, clock }, data.user.id, month)).days;
}

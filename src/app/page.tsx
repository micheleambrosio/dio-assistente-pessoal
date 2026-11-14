import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { CommandBar } from "@/components/CommandBar";
import { DayTimeline } from "@/components/DayTimeline";
import { MonthCalendar } from "@/components/MonthCalendar";
import { NavigationProvider } from "@/components/NavigationProvider";
import { MonthSummary } from "@/components/MonthSummary";
import { OverdueTimeline } from "@/components/OverdueTimeline";
import { MonthNav } from "@/components/MonthNav";
import { MonthSkeleton } from "@/components/MonthSkeleton";
import { PendingRemindersNotice } from "@/components/PendingRemindersNotice";
import type { Clock } from "@/core/ports";
import { getMonth } from "@/core/month-view";
import { ensureBillsCalendar } from "@/core/ensure-bills-calendar";
import { syncReminders } from "@/core/reminders";
import type { RemindersSyncSummary } from "@/core/reminders";
import { getClock, getRuntime } from "@/infra/runtime";
import { isMonth, monthLabel, shiftMonth } from "@/lib/month";

export default async function Home({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const clock = getClock();
  const { m, d } = await searchParams;
  const month = isMonth(m) ? m : clock.currentMonth();
  const { name, year } = monthLabel(month);

  return (
    <NavigationProvider>
      <main className="mx-auto flex min-h-dvh max-w-[1200px] flex-col gap-4 px-4 pt-14 pb-44 sm:px-6">
        {/* Falar com o Google demora: os avisos chegam depois, sem segurar o mês. */}
        <Suspense fallback={null}>
          <Notices clock={clock} />
        </Suspense>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <h1 key={month} className="display month-in text-[clamp(52px,11vw,120px)] uppercase">
            {name} <span className="ml-1 text-[0.4em] text-muted">{year}</span>
          </h1>
          <div className="flex items-center gap-2">
            <MonthNav previous={shiftMonth(month, -1)} next={shiftMonth(month, 1)} />
            <AccountMenu />
          </div>
        </header>
        <Suspense key={month} fallback={<MonthSkeleton />}>
          <MonthBody month={month} day={d} clock={clock} />
        </Suspense>
      </main>
      <CommandBar />
    </NavigationProvider>
  );
}

async function MonthBody({ month, day, clock }: { month: string; day?: string; clock: Clock }) {
  const view = await loadMonth(month, clock);
  const days = view?.days ?? {};
  const today = clock.today();
  const selected = day?.startsWith(month) && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : today.startsWith(month) ? today : `${month}-01`;
  return (
    <div className="month-in flex flex-col gap-4">
      {view && <MonthSummary summary={view.summary} occurrences={view.referenceOccurrences} />}
      <MonthCalendar month={month} today={today} selected={selected} days={days} />
      {/* Atrasadas é global e fica ao lado do dia (desktop) ou acima dele (mobile). */}
      <div className={`mt-1 grid grid-cols-[minmax(0,1fr)] items-start gap-6 ${view?.overdue.length ? "lg:grid-cols-2" : ""}`}>
        <OverdueTimeline occurrences={view?.overdue ?? []} />
        <DayTimeline date={selected} today={today} occurrences={days[selected] ?? []} />
      </div>
    </div>
  );
}

async function Notices({ clock }: { clock: Clock }) {
  const calendarFailed = await retryMissingBillsCalendar();
  const sync = await syncRemindersOnOpen(clock);
  return (
    <>
      {calendarFailed && (
        <p role="alert" className="rounded-[22px] bg-surface px-4 py-3 text-sm">
          Não conseguimos criar a agenda &quot;Contas do mês&quot; no seu Google Calendar.{" "}
          <Link href="/login" className="font-semibold underline">Entre de novo com o Google</Link> e, na tela de consentimento, marque a permissão do Google Calendar.
        </p>
      )}
      {sync?.accessRevoked && (
        <p role="alert" className="rounded-[22px] bg-surface px-4 py-3 text-sm">
          O Google recusou o acesso à sua agenda, e os lembretes estão parados.{" "}
          <Link href="/login" className="font-semibold underline">Reconecte a sua conta Google</Link> para enviá-los.
        </p>
      )}
      {sync && !sync.accessRevoked && sync.pendingCount > 0 && <PendingRemindersNotice count={sync.pendingCount} />}
    </>
  );
}

/** Se o login não conseguiu criar a Agenda de contas, tenta de novo ao abrir o app. true = falhou. */
async function retryMissingBillsCalendar() {
  const runtime = await getRuntime();
  if (!runtime) return false;

  const { repository, userId } = runtime;
  if (await repository.getBillsCalendarId(userId)) return false;

  try {
    await ensureBillsCalendar(runtime, userId);
    return false;
  } catch (e) {
    console.error("Falha ao criar a Agenda de contas", e);
    return true;
  }
}

async function loadMonth(month: string, clock: Clock) {
  const runtime = await getRuntime();
  if (!runtime) return null;
  return getMonth({ repository: runtime.repository, clock }, runtime.userId, month);
}

/** Estende a Janela de lembretes e retoma os pendentes. null = Usuário sem sessão ou falha inesperada. */
async function syncRemindersOnOpen(clock: Clock): Promise<RemindersSyncSummary | null> {
  const runtime = await getRuntime();
  if (!runtime) return null;
  try {
    return await syncReminders(
      { repository: runtime.repository, calendar: runtime.calendar, clock, appUrl: runtime.appUrl },
      runtime.userId,
    );
  } catch (e) {
    console.error("Falha ao sincronizar os Lembretes", e);
    return null;
  }
}

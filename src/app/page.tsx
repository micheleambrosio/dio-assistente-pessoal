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
import { SaoPauloClock } from "@/core/clock";
import { getMonth } from "@/core/commands";
import { ensureBillsCalendar } from "@/core/ensure-bills-calendar";
import { syncOnAppOpen } from "@/core/reminders";
import type { SyncStatus } from "@/core/reminders";
import { appUrl } from "@/infra/app-url";
import { GoogleCalendarGateway } from "@/infra/google-calendar-gateway";
import { createUserClient } from "@/infra/supabase";
import { SupabaseRepository } from "@/infra/supabase-repository";
import { isMonth, monthLabel, shiftMonth } from "@/lib/month";

export default async function Home({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const clock = new SaoPauloClock();
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

async function MonthBody({ month, day, clock }: { month: string; day?: string; clock: SaoPauloClock }) {
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

async function Notices({ clock }: { clock: SaoPauloClock }) {
  const calendarFailed = await retryMissingBillsCalendar();
  const sync = await syncReminders(clock);
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
  if (!data.user) return null;
  const repository = new SupabaseRepository(supabase);
  return getMonth({ repository, clock }, data.user.id, month);
}

/** Estende a Janela de lembretes e retoma os pendentes. null = Usuário sem sessão ou falha inesperada. */
async function syncReminders(clock: SaoPauloClock): Promise<SyncStatus | null> {
  const supabase = await createUserClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  try {
    const repository = new SupabaseRepository(supabase);
    return await syncOnAppOpen(
      { repository, calendar: new GoogleCalendarGateway(), clock, appUrl: appUrl() },
      data.user.id,
    );
  } catch (e) {
    console.error("Falha ao sincronizar os Lembretes", e);
    return null;
  }
}

import { cache } from "react";
import { SaoPauloClock } from "@/core/clock";
import type { Draft } from "@/core/domain";
import { FakeCalendarGateway } from "@/core/fakes/fake-calendar-gateway";
import { FakeCommandInterpreter } from "@/core/fakes/fake-command-interpreter";
import { FixedClock } from "@/core/fakes/fixed-clock";
import { InMemoryRepository } from "@/core/fakes/in-memory-repository";
import { PROTOTYPE_NOW, PROTOTYPE_USER_ID, seedPrototype } from "@/core/fakes/prototype-seed";
import type { CalendarGateway, Clock, CommandInterpreter, Repository } from "@/core/ports";
import { appUrl } from "./app-url";
import { GeminiCommandInterpreter } from "./gemini-command-interpreter";
import { GoogleCalendarGateway } from "./google-calendar-gateway";
import { createUserClient } from "./supabase";
import { SupabaseRepository } from "./supabase-repository";

/**
 * Raiz de composição: as portas que o app usa. Com `E2E_FAKES=1` (só nos testes de ponta a ponta)
 * entram as portas falsas, o Clock fixo e um Usuário de teste sem login; fora disso, as reais.
 */
export type Runtime = {
  userId: string;
  repository: Repository;
  calendar: CalendarGateway;
  interpreter: CommandInterpreter;
  clock: Clock;
  appUrl: string;
};

/** Duas condições: E2E_FAKES=1 e a chave anon de mentira do Playwright. Uma variável solta não desliga o login em produção. */
export const isE2E = () => process.env.E2E_FAKES === "1" && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "e2e";

export const getClock = (): Clock => (isE2E() ? new FixedClock(PROTOTYPE_NOW) : new SaoPauloClock());

/** O que o Comando "digitado" vira nos testes: o Gemini real não entra no CI. */
export const E2E_DRAFT: Draft = {
  title: "Spotify",
  amount: 21.9,
  recurrence: "monthly",
  day: 25,
  tags: ["subscriptions"],
};

type E2EWorld = { repository: InMemoryRepository; calendar: FakeCalendarGateway; interpreter: FakeCommandInterpreter };
// Um único mundo por processo do servidor: páginas e Server Actions compartilham a memória.
const world = globalThis as typeof globalThis & { __e2eWorld?: Promise<E2EWorld> };

async function createWorld(): Promise<E2EWorld> {
  const repository = new InMemoryRepository();
  const calendar = new FakeCalendarGateway();
  await seedPrototype(repository);
  await repository.claimBillsCalendarId(PROTOTYPE_USER_ID, await calendar.createBillsCalendar(PROTOTYPE_USER_ID, "Contas do mês"), null);
  return { repository, calendar, interpreter: new FakeCommandInterpreter(E2E_DRAFT, E2E_DRAFT) };
}

/** Volta o mundo falso ao estado do protótipo (isolamento entre testes). */
export function resetE2EWorld() {
  world.__e2eWorld = createWorld();
  world.__e2eWorld.catch(() => delete world.__e2eWorld); // uma falha não fica guardada
}

/** O Usuário da requisição com as portas a usar, ou null sem sessão. */
export const getRuntime = cache(async (): Promise<Runtime | null> => {
  if (isE2E()) {
    if (!world.__e2eWorld) resetE2EWorld();
    const { repository, calendar, interpreter } = await world.__e2eWorld!;
    return { userId: PROTOTYPE_USER_ID, repository, calendar, interpreter, clock: getClock(), appUrl: "http://localhost" };
  }
  const supabase = await createUserClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return {
    userId: data.user.id,
    repository: new SupabaseRepository(supabase),
    calendar: new GoogleCalendarGateway(),
    interpreter: new GeminiCommandInterpreter(),
    clock: getClock(),
    appUrl: appUrl(),
  };
});

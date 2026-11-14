import type { BillRule, Draft } from "./domain";

export interface Repository {
  getBillsCalendarId(userId: string): Promise<string | null>;
  /**
   * Guarda `calendarId` só se o id atual ainda for `replacing` (null = nenhum).
   * Devolve o id vencedor: o próprio `calendarId`, ou o que outra chamada
   * concorrente guardou antes.
   */
  claimBillsCalendarId(userId: string, calendarId: string, replacing: string | null): Promise<string>;
  /** Salva a Conta (e a sua primeira revisão) e devolve o id. */
  saveBill(userId: string, rule: Omit<BillRule, "id">): Promise<string>;
  listBills(userId: string): Promise<BillRule[]>;
}

export interface CalendarGateway {
  /** Cria a BillsCalendar no Google Calendar do Usuário e devolve o id dela. */
  createBillsCalendar(userId: string, name: string): Promise<string>;
  /** false quando o Usuário apagou a agenda no Google. */
  billsCalendarExists(userId: string, calendarId: string): Promise<boolean>;
  deleteBillsCalendar(userId: string, calendarId: string): Promise<void>;
}

/** Devolve null quando o Comando não foi entendido. */
export interface CommandInterpreter {
  interpret(text: string, today: string): Promise<Draft | null>;
  /** Aplica uma correção em linguagem natural ("não, é dia 16") ao que já foi entendido. */
  correct(previous: Draft, correction: string, today: string): Promise<Draft | null>;
}

export interface Clock {
  now(): Date;
  /** Data de hoje em America/Sao_Paulo, `YYYY-MM-DD`. */
  today(): string;
  /** Mês corrente em America/Sao_Paulo, `YYYY-MM`. */
  currentMonth(): string;
}

import type { AudioInput, BillRule, Draft, OccurrenceState, Reminder } from "./domain";

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
  listOccurrenceStates(userId: string): Promise<OccurrenceState[]>;
  /** Grava (ou troca) o estado do Vencimento. */
  saveOccurrenceState(userId: string, state: OccurrenceState): Promise<void>;
  listReminders(userId: string): Promise<Reminder[]>;
  saveReminders(userId: string, reminders: Omit<Reminder, "id">[]): Promise<Reminder[]>;
  updateReminder(
    userId: string,
    id: string,
    patch: Partial<Pick<Reminder, "syncStatus" | "googleEventId" | "lastError" | "paid" | "amount">>,
  ): Promise<void>;
  deleteReminder(userId: string, id: string): Promise<void>;
  /** true quando o Google recusou a autenticação e o Usuário precisa reconectar. */
  isAccessRevoked(userId: string): Promise<boolean>;
  setAccessRevoked(userId: string, revoked: boolean): Promise<void>;
}

/** O evento de um Lembrete, como o Calendar o recebe. Data e hora são locais em `timeZone`. */
export type ReminderEvent = {
  summary: string;
  description: string;
  /** `YYYY-MM-DDTHH:mm:ss` */
  start: string;
  end: string;
  timeZone: string;
  /** Minutos antes do início em que o pop-up dispara; null = sem notificação. */
  popupMinutesBefore: number | null;
};

/** O Google recusou a autenticação (token revogado ou expirado): o Usuário precisa reconectar. */
export class GoogleAuthError extends Error {
  constructor(message = "Acesso ao Google revogado") {
    super(message);
    this.name = "GoogleAuthError";
  }
}

export interface CalendarGateway {
  /** Cria a BillsCalendar no Google Calendar do Usuário e devolve o id dela. */
  createBillsCalendar(userId: string, name: string): Promise<string>;
  /** false quando o Usuário apagou a agenda no Google. */
  billsCalendarExists(userId: string, calendarId: string): Promise<boolean>;
  deleteBillsCalendar(userId: string, calendarId: string): Promise<void>;
  /** Cria o evento do Lembrete e devolve o id dele. Lança `GoogleAuthError` se o acesso foi revogado. */
  createReminder(userId: string, calendarId: string, event: ReminderEvent): Promise<string>;
  updateReminder(userId: string, calendarId: string, eventId: string, event: ReminderEvent): Promise<void>;
  /** Não falha se o evento já não existe. */
  deleteReminder(userId: string, calendarId: string, eventId: string): Promise<void>;
}

/** Devolve null quando o Comando não foi entendido. */
export interface CommandInterpreter {
  interpret(text: string, today: string): Promise<Draft | null>;
  /** Transcreve e interpreta o áudio numa única chamada. Devolve null quando não foi entendido. */
  interpretAudio(audio: AudioInput, today: string): Promise<{ draft: Draft; transcript: string } | null>;
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

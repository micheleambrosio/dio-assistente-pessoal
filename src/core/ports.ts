export interface Repository {
  getBillsCalendarId(userId: string): Promise<string | null>;
  /**
   * Guarda `calendarId` só se o id atual ainda for `replacing` (null = nenhum).
   * Devolve o id vencedor: o próprio `calendarId`, ou o que outra chamada
   * concorrente guardou antes.
   */
  claimBillsCalendarId(userId: string, calendarId: string, replacing: string | null): Promise<string>;
}

export interface CalendarGateway {
  /** Cria a BillsCalendar no Google Calendar do Usuário e devolve o id dela. */
  createBillsCalendar(userId: string, name: string): Promise<string>;
  /** false quando o Usuário apagou a agenda no Google. */
  billsCalendarExists(userId: string, calendarId: string): Promise<boolean>;
  deleteBillsCalendar(userId: string, calendarId: string): Promise<void>;
}

export interface Preview {
  summary: string;
}

export interface CommandInterpreter {
  interpret(userId: string, text: string): Promise<Preview>;
}

export interface Clock {
  now(): Date;
  /** Data de hoje em America/Sao_Paulo, `YYYY-MM-DD`. */
  today(): string;
  /** Mês corrente em America/Sao_Paulo, `YYYY-MM`. */
  currentMonth(): string;
}

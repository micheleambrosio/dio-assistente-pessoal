export interface Repository {
  getBillsCalendarId(userId: string): Promise<string | null>;
  saveBillsCalendarId(userId: string, calendarId: string): Promise<void>;
}

export interface CalendarGateway {
  /** Cria a BillsCalendar no Google Calendar do Usuário e devolve o id dela. */
  createBillsCalendar(userId: string, name: string): Promise<string>;
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

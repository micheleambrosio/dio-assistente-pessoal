/** Calendário de negócios: Feriados, Dia útil e Data efetiva. Datas são `YYYY-MM-DD`. */

const DAY_MS = 86_400_000;

function toUtc(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return toIso(new Date(toUtc(date).getTime() + days * DAY_MS));
}

/** Domingo de Páscoa (algoritmo gregoriano anônimo). */
function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toIso(new Date(Date.UTC(year, month - 1, day)));
}

const holidayCache = new Map<number, Set<string>>();

/** Feriados nacionais da lei, Sexta-feira Santa, Carnaval (seg e ter) e Corpus Christi. */
export function holidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const fixed = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "12-25"];
  if (year >= 2024) fixed.push("11-20"); // Consciência Negra, nacional desde a Lei 14.759/2023
  const easter = easterSunday(year);

  const set = new Set([
    ...fixed.map((d) => `${year}-${d}`),
    addDays(easter, -48), // segunda de Carnaval
    addDays(easter, -47), // terça de Carnaval
    addDays(easter, -2), // Sexta-feira Santa
    addDays(easter, 60), // Corpus Christi
  ]);
  holidayCache.set(year, set);
  return set;
}

function isBusinessDay(date: string): boolean {
  const weekday = toUtc(date).getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !holidays(Number(date.slice(0, 4))).has(date);
}

/** Data de vencimento ajustada para o próximo Dia útil (pode cruzar o mês). */
export function effectiveDate(dueDate: string): string {
  let date = dueDate;
  while (!isBusinessDay(date)) date = addDays(date, 1);
  return date;
}

/** Data de vencimento do `day` em `month` (`YYYY-MM`); dia inexistente vira o último dia do mês. */
export function dueDateIn(month: string, day: number): string {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

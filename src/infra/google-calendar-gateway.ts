import { GoogleAuthError } from "@/core/ports";
import type { CalendarGateway, ReminderEvent } from "@/core/ports";
import { loadRefreshToken } from "./google-connections";

async function accessTokenFor(userId: string) {
  const refreshToken = await loadRefreshToken(userId);
  if (!refreshToken) throw new GoogleAuthError("Usuário sem conexão Google");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // invalid_grant: o Usuário revogou o acesso ou o token expirou. Outros 400/5xx são falhas passageiras.
    if (res.status === 401 || body.includes("invalid_grant")) {
      throw new GoogleAuthError(`Acesso ao Google recusado (${res.status})`);
    }
    throw new Error(`Falha ao renovar o token no Google (${res.status}): ${body.slice(0, 500)}`);
  }
  const token = await res.json();
  if (!String(token.scope ?? "").includes("calendar.app.created")) {
    throw new GoogleAuthError(
      "O Google não concedeu a permissão do Calendar. Entre de novo e marque a caixa do Google Calendar na tela de consentimento.",
    );
  }
  return token.access_token as string;
}

async function googleError(action: string, res: Response) {
  const body = await res.text().catch(() => "");
  return new Error(`Falha ao ${action} no Google (${res.status}): ${body.slice(0, 500)}`);
}

const CALENDARS_URL = "https://www.googleapis.com/calendar/v3/calendars";

export class GoogleCalendarGateway implements CalendarGateway {
  async createBillsCalendar(userId: string, name: string) {
    const res = await fetch(CALENDARS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await accessTokenFor(userId)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ summary: name, timeZone: "America/Sao_Paulo" }),
    });
    if (!res.ok) throw await googleError("criar a agenda", res);
    return (await res.json()).id as string;
  }

  async billsCalendarExists(userId: string, calendarId: string) {
    const res = await fetch(`${CALENDARS_URL}/${encodeURIComponent(calendarId)}`, {
      headers: { Authorization: `Bearer ${await accessTokenFor(userId)}` },
    });
    if (res.status === 404 || res.status === 410) return false;
    if (!res.ok) throw await googleError("consultar a agenda", res);
    return true;
  }

  async deleteBillsCalendar(userId: string, calendarId: string) {
    const res = await fetch(`${CALENDARS_URL}/${encodeURIComponent(calendarId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${await accessTokenFor(userId)}` },
    });
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      throw await googleError("apagar a agenda", res);
    }
  }

  async createReminder(userId: string, calendarId: string, event: ReminderEvent) {
    const res = await fetch(eventsUrl(calendarId), {
      method: "POST",
      headers: await jsonHeaders(userId),
      body: JSON.stringify(eventBody(event)),
    });
    if (!res.ok) throw await eventError("criar o Lembrete", res);
    return (await res.json()).id as string;
  }

  async updateReminder(userId: string, calendarId: string, eventId: string, event: ReminderEvent) {
    const res = await fetch(`${eventsUrl(calendarId)}/${encodeURIComponent(eventId)}`, {
      method: "PUT",
      headers: await jsonHeaders(userId),
      body: JSON.stringify(eventBody(event)),
    });
    if (!res.ok) throw await eventError("alterar o Lembrete", res);
  }

  async deleteReminder(userId: string, calendarId: string, eventId: string) {
    const res = await fetch(`${eventsUrl(calendarId)}/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${await accessTokenFor(userId)}` },
    });
    if (!res.ok && res.status !== 404 && res.status !== 410) throw await eventError("apagar o Lembrete", res);
  }
}

const eventsUrl = (calendarId: string) => `${CALENDARS_URL}/${encodeURIComponent(calendarId)}/events`;

async function jsonHeaders(userId: string) {
  return { Authorization: `Bearer ${await accessTokenFor(userId)}`, "Content-Type": "application/json" };
}

function eventBody(event: ReminderEvent) {
  return {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.start, timeZone: event.timeZone },
    end: { dateTime: event.end, timeZone: event.timeZone },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: event.popupMinutesBefore }] },
  };
}

/** 401 é o token recusado; qualquer outro status é uma falha comum, que vira pendência. */
async function eventError(action: string, res: Response) {
  const error = await googleError(action, res);
  return res.status === 401 ? new GoogleAuthError(error.message) : error;
}

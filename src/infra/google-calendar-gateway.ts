import type { CalendarGateway } from "@/core/ports";
import { loadRefreshToken } from "./google-connections";

async function accessTokenFor(userId: string) {
  const refreshToken = await loadRefreshToken(userId);
  if (!refreshToken) throw new Error("Usuário sem conexão Google");
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
  if (!res.ok) throw new Error(`Falha ao renovar o token do Google (${res.status})`);
  return (await res.json()).access_token as string;
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
    if (!res.ok) throw new Error(`Falha ao criar a agenda no Google (${res.status})`);
    return (await res.json()).id as string;
  }

  async billsCalendarExists(userId: string, calendarId: string) {
    const res = await fetch(`${CALENDARS_URL}/${encodeURIComponent(calendarId)}`, {
      headers: { Authorization: `Bearer ${await accessTokenFor(userId)}` },
    });
    if (res.status === 404 || res.status === 410) return false;
    if (!res.ok) throw new Error(`Falha ao consultar a agenda no Google (${res.status})`);
    return true;
  }

  async deleteBillsCalendar(userId: string, calendarId: string) {
    const res = await fetch(`${CALENDARS_URL}/${encodeURIComponent(calendarId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${await accessTokenFor(userId)}` },
    });
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      throw new Error(`Falha ao apagar a agenda no Google (${res.status})`);
    }
  }
}

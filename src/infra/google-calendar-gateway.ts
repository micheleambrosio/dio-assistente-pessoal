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

export class GoogleCalendarGateway implements CalendarGateway {
  async createBillsCalendar(userId: string, name: string) {
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
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
}

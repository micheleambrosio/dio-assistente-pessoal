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
  if (!res.ok) throw await googleError("renovar o token", res);
  const token = await res.json();
  if (!String(token.scope ?? "").includes("calendar.app.created")) {
    throw new Error(
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
}

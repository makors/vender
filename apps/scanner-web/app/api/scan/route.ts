import { BEARER_TOKEN_COOKIE_NAME, SELECTED_EVENT_COOKIE_NAME } from "../../../lib/auth";
import { cookies } from "next/headers";

export type ScanApiResponse = {
  status: "invalid" | "already_scanned" | "valid" | "wrong_event";
  ticketId?: string;
  eventId?: string;
  eventName?: string;
  email?: string;
  studentName?: string | null;
  scannedAt?: string | null;
  error?: string;
};

function getApiBaseUrl(): string {
  const configured = process.env["TICKETS_API_URL"];
  if (configured && configured.length > 0) return configured;
  return process.env["NODE_ENV"] === "production" ? "http://api:3001" : "http://localhost:3001";
}

export async function POST(req: Request): Promise<Response> {
  const cookieStore = cookies();
  const bearerToken = cookieStore.get(BEARER_TOKEN_COOKIE_NAME)?.value || "";
  if (!bearerToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get the selected event from cookie
  const selectedEventCookie = cookieStore.get(SELECTED_EVENT_COOKIE_NAME)?.value;
  if (!selectedEventCookie) {
    return new Response(JSON.stringify({ error: "No event selected" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let selectedEvent: { id: string; name: string };
  try {
    selectedEvent = JSON.parse(selectedEventCookie);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid event selection" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  const body = await req.json().catch(() => null) as { ticketId?: string } | null;
  const ticketId = body?.ticketId;
  if (!ticketId) {
    return new Response(JSON.stringify({ error: "ticketId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const base = getApiBaseUrl();
  try {
    const upstream = await fetch(`${base}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearerToken}` },
      body: JSON.stringify({ ticketId, eventId: selectedEvent.id }),
    });

    const contentType = upstream.headers.get("content-type") || "";
    const text = await upstream.text();
    const payload = contentType.includes("application/json") ? text : JSON.stringify({ error: text });

    return new Response(payload, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Ticket API unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

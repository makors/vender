import { BEARER_TOKEN_COOKIE_NAME } from "../../../lib/auth";
import { cookies } from "next/headers";

export type EventWithStats = {
  id: string;
  name: string;
  stripe_price_id: string;
  created_at: string;
  updated_at: string;
  ticketCount: number;
  scannedCount: number;
};

export type EventsApiResponse = {
  events: EventWithStats[];
};

function getApiBaseUrl(): string {
  const configured = process.env["TICKETS_API_URL"];
  if (configured && configured.length > 0) return configured;
  return process.env["NODE_ENV"] === "production" ? "http://api:3001" : "http://localhost:3001";
}

export async function GET(): Promise<Response> {
  const cookieStore = cookies();
  const bearerToken = cookieStore.get(BEARER_TOKEN_COOKIE_NAME)?.value || "";
  if (!bearerToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const base = getApiBaseUrl();
  try {
    const upstream = await fetch(`${base}/events`, {
      method: "GET",
      headers: { Authorization: `Bearer ${bearerToken}` },
    });

    const contentType = upstream.headers.get("content-type") || "";
    const text = await upstream.text();
    const payload = contentType.includes("application/json") ? text : JSON.stringify({ error: text });

    return new Response(payload, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Events API unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}


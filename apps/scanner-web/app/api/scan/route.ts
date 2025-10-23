export type ScanApiResponse = {
  status: "invalid" | "already_scanned" | "valid";
  ticketId?: string;
  eventId?: string;
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId }),
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



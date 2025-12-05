import db, { type TicketedEvent } from "../db";
import { isLoggedIn } from "./login";

type EventWithStats = TicketedEvent & {
    ticketCount: number;
    scannedCount: number;
};

export async function events(req: Bun.BunRequest<"/events">): Promise<Response> {
    if (req.method !== "GET") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const loggedIn = await isLoggedIn(req.headers.get("Authorization")?.split(" ")[1] || "");
    if (!loggedIn) {
        return new Response("Unauthorized", { status: 401 });
    }

    const rows = db.query(`
        SELECT 
            e.id,
            e.name,
            e.stripe_price_id,
            e.created_at,
            e.updated_at,
            COUNT(t.id) as ticket_count,
            SUM(CASE WHEN t.scanned_at IS NOT NULL THEN 1 ELSE 0 END) as scanned_count
        FROM events e
        LEFT JOIN tickets t ON t.event_id = e.id
        GROUP BY e.id
        ORDER BY e.created_at DESC
    `).all() as Array<{
        id: string;
        name: string;
        stripe_price_id: string;
        created_at: string;
        updated_at: string;
        ticket_count: number;
        scanned_count: number;
    }>;

    const eventsList: EventWithStats[] = rows.map(row => ({
        id: row.id,
        name: row.name,
        stripe_price_id: row.stripe_price_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        ticketCount: row.ticket_count,
        scannedCount: row.scanned_count,
    }));

    return new Response(JSON.stringify({ events: eventsList }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
    });
}


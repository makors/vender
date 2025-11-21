import db from "../db";
import { isLoggedIn } from "./login";

type ScanResponse = {
    status: "invalid" | "already_scanned" | "valid";
    ticketId?: string;
    eventId?: string;
    email?: string;
    studentName?: string | null;
    scannedAt?: string | null;
};

export async function scan(req: Bun.BunRequest<"/scan">): Promise<Response> {
    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        return new Response(JSON.stringify({ error: "Expected application/json" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const loggedIn = await isLoggedIn(req.headers.get("Authorization")?.split(" ")[1] || "");
    if (!loggedIn) {
        return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => null) as { ticketId?: string } | null;
    const ticketId = body?.ticketId;
    if (!ticketId) {
        return new Response(JSON.stringify({ error: "ticketId is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const row = db.query(`
        SELECT t.id as ticket_id, t.event_id, t.student_name, t.scanned_at, c.email
        FROM tickets t
        JOIN customers c ON c.id = t.customer_id
        WHERE t.id = ?
    `).get(ticketId) as | {
        ticket_id: string;
        event_id: string;
        student_name: string | null;
        scanned_at: string | null;
        email: string;
    } | undefined;

    if (!row) {
        const res: ScanResponse = { status: "invalid" };
        return new Response(JSON.stringify(res), { headers: { "Content-Type": "application/json" }, status: 200 });
    }

    if (row.scanned_at) {
        const res: ScanResponse = {
            status: "already_scanned",
            ticketId: row.ticket_id,
            eventId: row.event_id,
            email: row.email,
            studentName: row.student_name,
            scannedAt: row.scanned_at,
        };
        return new Response(JSON.stringify(res), { headers: { "Content-Type": "application/json" }, status: 200 });
    }

    const scannedAtIso = new Date().toISOString();
    db.run(`UPDATE tickets SET scanned_at = ? WHERE id = ?`, [scannedAtIso, ticketId]);

    const res: ScanResponse = {
        status: "valid",
        ticketId: row.ticket_id,
        eventId: row.event_id,
        email: row.email,
        studentName: row.student_name,
        scannedAt: scannedAtIso,
    };
    return new Response(JSON.stringify(res), { headers: { "Content-Type": "application/json" }, status: 200 });
}



import db from "../db";
import { isLoggedIn } from "./login";

type LookupRow = {
    ticket_id: string;
    event_id: string;
    email: string;
    student_name: string | null;
    scanned_at: string | null;
    created_at?: string | null;
};

function normalizeWhitespace(input: string): string {
    return input.trim().replace(/\s+/g, " ");
}

function toLowerSafe(input: string | null | undefined): string {
    return (input || "").toLowerCase();
}

function stripEmailPlusTag(emailLower: string): string {
    // Convert "local+tag@domain" -> "local@domain"
    const atIndex = emailLower.indexOf("@");
    if (atIndex === -1) return emailLower;
    const local = emailLower.slice(0, atIndex);
    const plusIndex = local.indexOf("+");
    if (plusIndex === -1) return emailLower;
    return local.slice(0, plusIndex) + emailLower.slice(atIndex);
}

function isHexLikeIdFragment(input: string): boolean {
    return /^[0-9a-f-]{4,}$/i.test(input);
}

function levenshteinDistance(a: string, b: string): number {
    // Fast path
    if (a === b) return 0;
    const aLen = a.length;
    const bLen = b.length;
    if (aLen === 0) return bLen;
    if (bLen === 0) return aLen;

    const v0: number[] = Array.from({ length: bLen + 1 }, (_, i) => i);
    const v1: number[] = new Array<number>(bLen + 1).fill(0);
    for (let i = 0; i < aLen; i++) {
        v1[0] = i + 1;
        const aCode = a.charCodeAt(i);
        for (let j = 0; j < bLen; j++) {
            const cost = aCode === b.charCodeAt(j) ? 0 : 1;
            const left = (v1[j]!) + 1;
            const up = (v0[j + 1]!) + 1;
            const diag = (v0[j]!) + cost;
            v1[j + 1] = Math.min(left, up, diag);
        }
        for (let j = 0; j <= bLen; j++) v0[j] = v1[j]!;
    }
    return v0[bLen]!;
}

function computeNameTokenScore(nameLower: string, queryLower: string): number {
    if (!nameLower || !queryLower) return 0;
    const tokens = queryLower.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return 0;
    const parts = nameLower.split(/\s+/).filter(Boolean);
    let score = 0;

    for (const token of tokens) {
        let bestForToken = 0;
        for (const part of parts) {
            if (part === token) {
                bestForToken = Math.max(bestForToken, 120);
            } else if (part.startsWith(token)) {
                bestForToken = Math.max(bestForToken, 90);
            } else if (part.includes(token)) {
                bestForToken = Math.max(bestForToken, 60);
            } else {
                // small fuzzy tolerance
                const dist = levenshteinDistance(part, token);
                const maxLen = Math.max(part.length, token.length) || 1;
                const similarity = 1 - dist / maxLen; // 0..1
                if (similarity >= 0.7) {
                    bestForToken = Math.max(bestForToken, Math.round(similarity * 80));
                }
            }
        }
        score += bestForToken;
    }
    return score;
}

function computeScore(row: LookupRow, qRaw: string): number {
    const qLower = toLowerSafe(normalizeWhitespace(qRaw));
    const emailLower = toLowerSafe(row.email);
    const emailPlusless = stripEmailPlusTag(emailLower);
    const nameLower = toLowerSafe(normalizeWhitespace(row.student_name || ""));
    const scannedPenalty = row.scanned_at ? 20 : 0; // prefer unscanned slightly

    let score = 0;

    // Email signals
    if (qLower.includes("@")) {
        const qPlusless = stripEmailPlusTag(qLower);
        if (emailLower === qLower) score += 1000;
        if (emailPlusless === qPlusless) score += 940;
        if (emailLower.startsWith(qLower)) score += 860;
        if (emailPlusless.startsWith(qPlusless)) score += 820;
        if (emailLower.includes(qLower)) score += 700;
        if (emailPlusless.includes(qPlusless)) score += 660;
    } else {
        if (emailLower.startsWith(qLower)) score += 420;
        if (emailLower.includes(qLower)) score += 300;
    }

    // Name signals (token/prefix/fuzzy)
    score += computeNameTokenScore(nameLower, qLower);

    // Ticket id signals (allow partial)
    if (isHexLikeIdFragment(qRaw)) {
        const tid = row.ticket_id.toLowerCase();
        const qId = qRaw.toLowerCase();
        if (tid === qId) score += 1000;
        else if (tid.startsWith(qId)) score += 920;
        else if (tid.includes(qId)) score += 540;
    }

    // Small recency nudge if available
    if ((row as any).created_at) {
        try {
            const createdMs = Date.parse((row as any).created_at as string);
            if (!Number.isNaN(createdMs)) {
                const ageDays = (Date.now() - createdMs) / (1000 * 60 * 60 * 24);
                if (ageDays < 7) score += 20;
                else if (ageDays < 30) score += 10;
            }
        } catch { /* ignore */ }
    }

    return score - scannedPenalty;
}

export async function lookup(req: Bun.BunRequest<"/lookup">): Promise<Response> {
    if (req.method !== "GET") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const loggedIn = await isLoggedIn(req.headers.get("Authorization")?.split(" ")[1] || "");
    if (!loggedIn) {
        return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    if (!q) {
        return new Response(JSON.stringify({ results: [] }), {
            headers: { "Content-Type": "application/json" },
        });
    }

    // Broad candidate fetch with partial matches on name, email, and ticket id
    const escaped = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
    const like = `%${escaped}%`;

    const candidates = db.query(
        `SELECT t.id as ticket_id, t.event_id, c.email, t.student_name, t.scanned_at, t.created_at
         FROM tickets t
         JOIN customers c ON c.id = t.customer_id
         WHERE (t.student_name LIKE ? ESCAPE '\\' OR c.email LIKE ? ESCAPE '\\' OR t.id LIKE ? ESCAPE '\\')
         ORDER BY t.created_at DESC
         LIMIT 200`
    ).all(like, like, like) as LookupRow[];

    // Rank candidates for accuracy
    const ranked = candidates
        .map((row) => ({ row, score: computeScore(row, q) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 25)
        .map((r) => r.row);

    return new Response(JSON.stringify({ results: ranked }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
    });
}



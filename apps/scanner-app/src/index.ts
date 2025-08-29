import prompts from "prompts";
import { green, yellow, red, bold, dim, cyan } from "kolorist";

const API_URL = process.env["API_URL"] || "http://localhost:3001";

// Ensure Ctrl+C exits immediately even if a prompt is active
process.on("SIGINT", () => {
    console.log("\n" + dim("Exiting"));
    process.exit(0);
});

function isUuidLike(input: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.trim());
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
}

async function getJson<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
}

type ScanResponse = {
    status: "invalid" | "already_scanned" | "valid";
    ticketId?: string;
    eventId?: string;
    email?: string;
    studentName?: string | null;
    scannedAt?: string | null;
};

type LookupItem = {
    ticket_id: string;
    event_id: string;
    email: string;
    student_name: string | null;
    scanned_at: string | null;
};

async function handleScan(ticketId: string): Promise<void> {
    try {
        const data = await postJson<ScanResponse>("/scan", { ticketId });
            if (data.status === "valid") {
            console.log(green(bold("■■■■■■■■■■■■■■■■■■■■■■■■■■■■■")))
            console.log(green(bold("VALID")), dim(`ticket: ${data.ticketId}`), cyan(data.studentName ?? ""));
            console.log(green(bold("■■■■■■■■■■■■■■■■■■■■■■■■■■■■■")))
        } else if (data.status === "already_scanned") {
            console.log(yellow(bold("■■■■■■■■■■■■■■■■■■■■■■■■■■■■■")))
            console.log(yellow(bold("ALREADY SCANNED")), dim(`ticket: ${data.ticketId}`), cyan(data.studentName ?? ""), dim(`at ${data.scannedAt}`));
            console.log(yellow(bold("■■■■■■■■■■■■■■■■■■■■■■■■■■■■■")))
        } else {
            console.log(red(bold("■■■■■■■■■■■■■■■■■■■■■■■■■■■■■")))
            console.log(red(bold("INVALID")), dim(`ticket: ${ticketId}`));
            console.log(red(bold("■■■■■■■■■■■■■■■■■■■■■■■■■■■■■")))
        }
    } catch (err) {
        console.error(red(`Scan failed: ${(err as Error).message}`));
    }
}

async function handleLookup(query: string): Promise<void> {
    try {
        const { results } = await getJson<{ results: LookupItem[] }>(`/lookup?q=${encodeURIComponent(query)}`);
        if (!results.length) {
            console.log(red("No results"));
            return;
        }

        const choices = results.map((r) => ({
            title: `${r.student_name ?? "(no name)"}  <${r.email}>  ${r.ticket_id.slice(0, 8)}...${r.ticket_id.slice(-4)} ${r.scanned_at ? "(scanned)" : ""}`,
            value: r.ticket_id,
            description: `${r.ticket_id}`,
        }));

        choices.push({
            title: "Scan new ticket",
            value: "new",
            description: "Scan a new ticket",
        });

        const answer = await prompts({
            type: "select",
            name: "ticketId",
            message: "Select a ticket to scan",
            choices,
            initial: 0,
        }, {
            onCancel: () => {
                console.log(dim("Cancelled"));
                process.exit(0);
            }
        });

        if (answer.ticketId === "new") {
            return;
        }

        if (!answer.ticketId) {
            console.log(dim("Cancelled"));
            return;
        }

        await handleScan(answer.ticketId as string);
    } catch (err) {
        console.error(red(`Lookup failed: ${(err as Error).message}`));
    }
}

async function main() {
    console.log(dim(`API: ${API_URL}`));

    // If user passed args, use them; else prompt continuously
    const arg = process.argv.slice(2).join(" ").trim();
    while (true) {
        const input = arg || (await prompts({
            type: "text",
            name: "value",
            message: "Scan QR / Enter ticket ID, name, or email",
        }, {
            onCancel: () => {
                console.log(dim("Cancelled"));
                process.exit(0);
            }
        })).value;

        if (!input) {
            if (arg) break;
            console.log(dim("Empty input — press Ctrl+C to exit."));
            continue;
        }

        if (isUuidLike(input)) {
            await handleScan(input);
        } else {
            await handleLookup(input);
        }

        if (arg) break;
    }
}

main().catch((err) => {
    console.error(red(`Fatal: ${(err as Error).stack || (err as Error).message}`));
    process.exit(1);
});



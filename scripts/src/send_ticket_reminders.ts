import { Database } from "bun:sqlite";
import nodemailer from "nodemailer";
import QRCode from "qrcode";

const db = new Database("../data/vender.db");

type Ticket = {
    id: string;
    event_id: string;
    customer_id: number;
    student_name: string | null;
    scanned_at: string | null;
    created_at: string;
};

type Customer = {
    id: number;
    email: string;
    stripe_customer_id: string;
    created_at: string;
};

type Event = {
    id: string;
    name: string;
    stripe_price_id: string;
    created_at: string;
    updated_at: string;
};

type TicketWithDetails = Ticket & {
    email: string;
    event_name: string;
};

// Email configuration
function getTransporter(): nodemailer.Transporter {
    const host = process.env["SMTP_HOST"];
    const port = process.env["SMTP_PORT"] ? Number(process.env["SMTP_PORT"]) : undefined;
    const user = process.env["SMTP_USER"];
    const pass = process.env["SMTP_PASS"];

    if (!host || !port || !user || !pass) {
        throw new Error("SMTP configuration is missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.");
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: true,
        auth: { user, pass },
    });
}

// Generate QR code for ticket
async function generateTicketQrPng(ticketId: string): Promise<Buffer> {
    return QRCode.toBuffer(ticketId, {
        type: "png",
        errorCorrectionLevel: "M",
        margin: 1,
        scale: 6,
    });
}

// Send reminder email
async function sendReminderEmail(
    recipientEmail: string,
    studentName: string | null,
    ticketId: string,
    eventName: string
): Promise<void> {
    const fromEmail = process.env["SMTP_FROM"] || process.env["SMTP_USER"] || "no-reply@example.com";
    const fromName = process.env["SMTP_FROM_NAME"] || "Vender Tickets";

    const transporter = getTransporter();
    const qrPng = await generateTicketQrPng(ticketId);
    const qrCid = `ticket-${ticketId}@vender`;

    const displayName = studentName || "there";

    const subject = `Reminder: Print your ticket for ${eventName}`;
    const textBody = [
        `Hi ${displayName},`,
        "",
        `This is a friendly reminder to print your ticket for ${eventName}.`,
        "",
        `Ticket ID: ${ticketId}`,
        "",
        "Please print the attached QR code and bring it to the event for check-in.",
        "",
        "If you've already printed your ticket, you can disregard this reminder.",
        "",
        "Thanks,",
        fromName,
    ].join("\n");

    const htmlBody = [
        `<p>Hi ${displayName},</p>`,
        `<p>This is a friendly reminder to <strong>print your ticket</strong> for <strong>${eventName}</strong>.</p>`,
        `<p><strong>Ticket ID:</strong> ${ticketId}</p>`,
        `<p><strong>Please print this QR code and bring it to the event</strong> for check-in:</p>`,
        `<div style="text-align: center; padding: 20px;">`,
        `  <img src="cid:${qrCid}" alt="Ticket QR Code" style="max-width:300px;height:auto;border:2px solid #333;padding:10px;" />`,
        `</div>`,
        `<p style="color: #666; font-size: 0.9em;">If you've already printed your ticket, you can disregard this reminder.</p>`,
        `<p>Thanks,<br/>${fromName}</p>`,
    ].join("");

    await transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to: recipientEmail,
        subject,
        text: textBody,
        html: htmlBody,
        attachments: [
            {
                filename: `ticket-${ticketId}.png`,
                content: qrPng,
                contentType: "image/png",
                cid: qrCid,
            },
        ],
    });
}

// Get unscanned tickets
function getUnscannedTickets(eventId?: string): TicketWithDetails[] {
    let query = `
        SELECT t.*, c.email, e.name as event_name
        FROM tickets t
        JOIN customers c ON c.id = t.customer_id
        JOIN events e ON e.id = t.event_id
        WHERE t.scanned_at IS NULL
    `;

    if (eventId) {
        query += ` AND t.event_id = ?`;
        return db.query(query).all(eventId) as TicketWithDetails[];
    }

    return db.query(query).all() as TicketWithDetails[];
}

// List all events
function listEvents(): Event[] {
    return db.query("SELECT * FROM events ORDER BY created_at DESC").all() as Event[];
}

// Main menu
function printMenu() {
    console.log("\n╔════════════════════════════════════════════╗");
    console.log("║   TICKET REMINDER EMAIL SENDER             ║");
    console.log("╚════════════════════════════════════════════╝");
    console.log("\n📧 Options:");
    console.log("  1. Send reminders for all unscanned tickets");
    console.log("  2. Send reminders for a specific event");
    console.log("  3. Preview unscanned tickets (no emails sent)");
    console.log("  4. Send reminder for a specific ticket");
    console.log("  0. Exit");
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// Send reminders for all unscanned tickets
async function sendAllReminders() {
    console.log("\n📧 SENDING REMINDERS FOR ALL UNSCANNED TICKETS\n");

    const tickets = getUnscannedTickets();

    if (tickets.length === 0) {
        console.log("  ✅ No unscanned tickets found. All done!");
        return;
    }

    console.log(`  Found ${tickets.length} unscanned ticket(s).`);

    const confirm = prompt(`\n⚠️  Send reminder emails to ${tickets.length} customer(s)? (yes/no):`);

    if (confirm?.toLowerCase() !== "yes") {
        console.log("  ❌ Cancelled.");
        return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const ticket of tickets) {
        try {
            console.log(`  📤 Sending to ${ticket.email} (${ticket.event_name})...`);
            await sendReminderEmail(ticket.email, ticket.student_name, ticket.id, ticket.event_name);
            console.log(`     ✅ Sent successfully`);
            successCount++;
        } catch (error) {
            console.error(`     ❌ Failed: ${error}`);
            failCount++;
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Successfully sent: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
}

// Send reminders for a specific event
async function sendEventReminders() {
    console.log("\n📧 SEND REMINDERS FOR SPECIFIC EVENT\n");

    const events = listEvents();

    if (events.length === 0) {
        console.log("  ❌ No events found.");
        return;
    }

    console.log("📅 Available Events:");
    events.forEach((event, idx) => {
        const unscannedCount = (
            db.query("SELECT COUNT(*) as count FROM tickets WHERE event_id = ? AND scanned_at IS NULL")
                .get(event.id) as { count: number }
        ).count;
        console.log(`  ${idx + 1}. ${event.name} (${unscannedCount} unscanned tickets)`);
    });

    const eventChoice = prompt("\nSelect event number:");
    const eventIdx = parseInt(eventChoice || "0") - 1;

    if (eventIdx < 0 || eventIdx >= events.length) {
        console.log("  ❌ Invalid event selection.");
        return;
    }

    const selectedEvent = events[eventIdx]!;
    const tickets = getUnscannedTickets(selectedEvent.id);

    if (tickets.length === 0) {
        console.log(`  ✅ No unscanned tickets for "${selectedEvent.name}". All done!`);
        return;
    }

    console.log(`\n  Found ${tickets.length} unscanned ticket(s) for "${selectedEvent.name}".`);

    const confirm = prompt(`\n⚠️  Send reminder emails to ${tickets.length} customer(s)? (yes/no):`);

    if (confirm?.toLowerCase() !== "yes") {
        console.log("  ❌ Cancelled.");
        return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const ticket of tickets) {
        try {
            console.log(`  📤 Sending to ${ticket.email}...`);
            await sendReminderEmail(ticket.email, ticket.student_name, ticket.id, ticket.event_name);
            console.log(`     ✅ Sent successfully`);
            successCount++;
        } catch (error) {
            console.error(`     ❌ Failed: ${error}`);
            failCount++;
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Successfully sent: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
}

// Preview unscanned tickets
function previewUnscannedTickets() {
    console.log("\n👀 PREVIEW UNSCANNED TICKETS\n");

    const tickets = getUnscannedTickets();

    if (tickets.length === 0) {
        console.log("  ✅ No unscanned tickets found. All done!");
        return;
    }

    console.log(`  Total: ${tickets.length} unscanned ticket(s)\n`);

    // Group by event
    const byEvent = new Map<string, TicketWithDetails[]>();
    for (const ticket of tickets) {
        if (!byEvent.has(ticket.event_name)) {
            byEvent.set(ticket.event_name, []);
        }
        byEvent.get(ticket.event_name)!.push(ticket);
    }

    for (const [eventName, eventTickets] of byEvent) {
        console.log(`\n📅 Event: ${eventName}`);
        console.log(`   Unscanned tickets: ${eventTickets.length}`);
        console.log(`   ─────────────────────────────────────`);

        for (const ticket of eventTickets) {
            console.log(`   • ${ticket.email}`);
            console.log(`     Student: ${ticket.student_name || "N/A"}`);
            console.log(`     Ticket ID: ${ticket.id}`);
            console.log(`     Created: ${ticket.created_at}`);
            console.log();
        }
    }
}

// Send reminder for a specific ticket
async function sendSpecificTicketReminder() {
    console.log("\n📧 SEND REMINDER FOR SPECIFIC TICKET\n");

    const ticketId = prompt("Enter ticket ID:");
    if (!ticketId) {
        console.log("  ❌ Ticket ID is required.");
        return;
    }

    const ticket = db.query(`
        SELECT t.*, c.email, e.name as event_name
        FROM tickets t
        JOIN customers c ON c.id = t.customer_id
        JOIN events e ON e.id = t.event_id
        WHERE t.id = ?
    `).get(ticketId) as TicketWithDetails | undefined;

    if (!ticket) {
        console.log(`  ❌ Ticket with ID '${ticketId}' not found.`);
        return;
    }

    console.log(`\n  Ticket Details:`);
    console.log(`  ────────────────────────────────────────`);
    console.log(`  Event: ${ticket.event_name}`);
    console.log(`  Customer: ${ticket.email}`);
    console.log(`  Student: ${ticket.student_name || "N/A"}`);
    console.log(`  Status: ${ticket.scanned_at ? "✓ SCANNED" : "⭘ NOT SCANNED"}`);
    console.log(`  ────────────────────────────────────────\n`);

    if (ticket.scanned_at) {
        console.log(`  ℹ️  Note: This ticket has already been scanned.`);
    }

    const confirm = prompt(`\nSend reminder email to ${ticket.email}? (yes/no):`);

    if (confirm?.toLowerCase() !== "yes") {
        console.log("  ❌ Cancelled.");
        return;
    }

    try {
        console.log(`\n  📤 Sending reminder to ${ticket.email}...`);
        await sendReminderEmail(ticket.email, ticket.student_name, ticket.id, ticket.event_name);
        console.log(`  ✅ Reminder sent successfully!`);
    } catch (error) {
        console.error(`  ❌ Failed to send reminder: ${error}`);
    }
}

// Main function
async function main() {
    // Check SMTP configuration
    try {
        getTransporter();
    } catch (error) {
        console.error("\n❌ Error: SMTP configuration is missing!");
        console.error("Please set the following environment variables:");
        console.error("  - SMTP_HOST");
        console.error("  - SMTP_PORT");
        console.error("  - SMTP_USER");
        console.error("  - SMTP_PASS");
        console.error("  - SMTP_FROM (optional)");
        console.error("  - SMTP_FROM_NAME (optional)\n");
        process.exit(1);
    }

    while (true) {
        printMenu();
        const choice = prompt("\nEnter your choice:");

        try {
            switch (choice) {
                case "1":
                    await sendAllReminders();
                    break;
                case "2":
                    await sendEventReminders();
                    break;
                case "3":
                    previewUnscannedTickets();
                    break;
                case "4":
                    await sendSpecificTicketReminder();
                    break;
                case "0":
                    console.log("\n👋 Goodbye!\n");
                    process.exit(0);
                default:
                    console.log("\n  ❌ Invalid choice. Please try again.");
            }
        } catch (error) {
            console.error("\n  ❌ Error:", error);
        }

        prompt("\nPress Enter to continue...");
    }
}

main();


import { Database } from "bun:sqlite";
import { v4 as uuidv4 } from "uuid";
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

// ---------- Helpers ----------
const isYes = (s?: string) => {
  const v = (s ?? "").trim().toLowerCase();
  return v === "y" || v === "yes";
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return v;
}

// ---------- Email configuration ----------
function getTransporter(): nodemailer.Transporter {
  const host = requireEnv("SMTP_HOST");
  const portStr = requireEnv("SMTP_PORT");
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASS");

  const port = Number(portStr);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`SMTP_PORT must be a positive integer. Got: "${portStr}"`);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  // Hard defense: Some setups register compile plugins globally
  const anyT = transporter as any;
  if (anyT?._plugins?.compile?.length) {
    console.log(
      "⚠️  Disabling Nodemailer compile plugins for this script:",
      anyT._plugins.compile.map((p: any) => p?.name || "anonymous")
    );
    anyT._plugins.compile = [];
  }

  return transporter;
}

async function verifyTransporterOrExit() {
  const t = getTransporter();
  try {
    await t.verify();
    return t;
  } catch (e: any) {
    console.error("\n❌ SMTP verify failed.");
    console.error("   name:", e?.name);
    console.error("   message:", e?.message);
    if (e?.code) console.error("   code:", e.code);
    if (e?.response) console.error("   response:", e.response);
    if (e?.responseCode) console.error("   responseCode:", e.responseCode);
    console.error("\nCheck:");
    console.error("  • SMTP_HOST / SMTP_PORT");
    console.error("  • SMTP_USER / SMTP_PASS");
    process.exit(1);
  }
}

// ---------- QR code ----------
async function generateTicketQrPng(ticketId: string): Promise<Buffer> {
  return QRCode.toBuffer(ticketId, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 6,
  });
}

// ---------- Send ticket email ----------
async function sendTicketEmail(
  transporter: nodemailer.Transporter,
  recipientEmail: string,
  studentName: string | null,
  ticketId: string,
  eventName: string
): Promise<void> {
  const fromEmail = process.env["SMTP_FROM"] || process.env["SMTP_USER"] || "no-reply@example.com";
  const fromName = process.env["SMTP_FROM_NAME"] || "Vender Tickets";

  const qrPng = await generateTicketQrPng(ticketId);
  const qrCid = `ticket-${ticketId}@vender`;

  const displayName = studentName || "there";
  const subject = `Your ticket for ${eventName}`;

  const textBody = [
    `Hi ${displayName},`,
    "",
    `Your ticket for ${eventName} is confirmed — yay!`,
    "",
    `Ticket ID: ${ticketId}`,
    "",
    "Please print the QR code and give it to your child to bring to check-in.",
    "",
    "Thanks,",
    fromName,
  ].join("\n");

  const htmlBody = [
    `<p>Hi ${displayName},</p>`,
    `<p>Your ticket for <strong>${eventName}</strong> is confirmed — yay!</p>`,
    `<p><strong>Ticket ID:</strong> ${ticketId}</p>`,
    `<p><strong>Please print this QR code and give it to your child</strong> to bring to check-in:</p>`,
    `<div style="text-align: center; padding: 20px;">`,
    `  <img src="cid:${qrCid}" alt="Ticket QR Code" style="max-width:300px;height:auto;border:2px solid #333;padding:10px;" />`,
    `</div>`,
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

// ---------- Main workflow ----------
async function main() {
  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║   MANUAL TICKET CREATION + EMAIL           ║");
  console.log("╚════════════════════════════════════════════╝\n");

  // Verify SMTP first
  console.log("🔌 Verifying SMTP connection...");
  const transporter = await verifyTransporterOrExit();
  console.log("✅ SMTP connection verified!\n");

  // ----- Step 1: Select Event -----
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 1: Select Event");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const events = db.query("SELECT * FROM events ORDER BY created_at DESC").all() as Event[];
  if (events.length === 0) {
    console.log("❌ No events found. Create an event first.");
    process.exit(1);
  }

  console.log("📅 Available Events:");
  events.forEach((event, idx) => {
    const ticketCount = (
      db.query("SELECT COUNT(*) as count FROM tickets WHERE event_id = ?").get(event.id) as { count: number }
    ).count;
    console.log(`  ${idx + 1}. ${event.name} (${ticketCount} tickets)`);
  });

  const eventChoice = prompt("\nSelect event number:");
  const eventIdx = parseInt(eventChoice || "0") - 1;

  if (eventIdx < 0 || eventIdx >= events.length) {
    console.log("❌ Invalid event selection.");
    process.exit(1);
  }

  const selectedEvent = events[eventIdx]!;
  console.log(`\n✅ Selected: ${selectedEvent.name}\n`);

  // ----- Step 2: Enter Email -----
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 2: Customer Email");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const email = prompt("Enter customer email:")?.trim();
  if (!email) {
    console.log("❌ Email is required.");
    process.exit(1);
  }

  // Check if customer exists
  let customer = db.query("SELECT * FROM customers WHERE email = ?").get(email) as Customer | undefined;
  let customerId: number;

  if (customer) {
    console.log(`\n✅ Found existing customer: ID ${customer.id}`);
    customerId = customer.id;
  } else {
    console.log(`\nℹ️  Customer not found. Creating new customer...`);
    const stripeCustomerId = `manual-${uuidv4()}`;
    const result = db.run("INSERT INTO customers (email, stripe_customer_id) VALUES (?, ?)", [email, stripeCustomerId]);
    customerId = result.lastInsertRowid as number;
    console.log(`✅ Created new customer with ID: ${customerId}`);
  }

  // ----- Step 3: Enter ticket details -----
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 3: Ticket Details");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const ticketCountStr = prompt("How many tickets? (default: 1):")?.trim() || "1";
  const ticketCount = parseInt(ticketCountStr);

  if (isNaN(ticketCount) || ticketCount < 1) {
    console.log("❌ Invalid ticket count.");
    process.exit(1);
  }

  const studentNames: (string | null)[] = [];

  for (let i = 0; i < ticketCount; i++) {
    const name = prompt(`Enter student name for ticket ${i + 1} (optional):`)?.trim() || null;
    studentNames.push(name);
  }

  // ----- Step 4: Confirmation -----
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("CONFIRMATION");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📋 Summary:");
  console.log(`   Event: ${selectedEvent.name}`);
  console.log(`   Email: ${email}`);
  console.log(`   Customer ID: ${customerId}`);
  console.log(`   Tickets: ${ticketCount}`);
  studentNames.forEach((name, idx) => {
    console.log(`     ${idx + 1}. ${name || "(no name)"}`);
  });

  const confirm = prompt("\n⚠️  Create tickets and send email? (yes/no):");
  if (!isYes(confirm ?? "")) {
    console.log("\n❌ Cancelled.");
    process.exit(0);
  }

  // ----- Step 5: Create tickets -----
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("CREATING TICKETS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const createdTickets: { id: string; studentName: string | null }[] = [];

  for (let i = 0; i < ticketCount; i++) {
    const ticketId = uuidv4();
    const studentName = studentNames[i];

    db.run("INSERT INTO tickets (id, event_id, customer_id, student_name, created_at) VALUES (?, ?, ?, ?, ?)", [
      ticketId,
      selectedEvent.id,
      customerId,
      studentName,
      new Date().toISOString(),
    ]);

    createdTickets.push({ id: ticketId, studentName });
    console.log(`✅ Created ticket: ${ticketId} (${studentName || "no name"})`);
  }

  // ----- Step 6: Send emails -----
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("SENDING EMAILS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  let emailSuccessCount = 0;
  let emailFailCount = 0;

  for (const ticket of createdTickets) {
    try {
      console.log(`📤 Sending email for ticket ${ticket.id}...`);
      await sendTicketEmail(transporter, email, ticket.studentName, ticket.id, selectedEvent.name);
      console.log(`   ✅ Email sent!`);
      emailSuccessCount++;
    } catch (error) {
      console.error(`   ❌ Failed to send email:`, error);
      emailFailCount++;
    }
  }

  // ----- Final Summary -----
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("COMPLETE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📊 Results:");
  console.log(`   Tickets created: ${createdTickets.length}`);
  console.log(`   Emails sent: ${emailSuccessCount}`);
  if (emailFailCount > 0) {
    console.log(`   Emails failed: ${emailFailCount}`);
  }

  console.log("\n🎫 Created Ticket IDs:");
  createdTickets.forEach((t, idx) => {
    console.log(`   ${idx + 1}. ${t.id}`);
  });

  console.log("\n👋 Done!\n");
}

main();


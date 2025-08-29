import stripe from "../stripe";
import { Buffer } from "node:buffer";
import Stripe from "stripe";
import db from "../db";
import { v4 as uuid } from "uuid";
import { sendTicketSuccessEmail } from "../email";

export default async function webhook(req: Bun.BunRequest<"/stripe/webhook">) {
  const signature = req.headers.get("stripe-signature") || "";
  const rawBody = Buffer.from(await req.arrayBuffer()).toString("utf-8");

  const event = await stripe.webhooks.constructEventAsync(
    rawBody,
    signature,
    process.env["STRIPE_WEBHOOK_SECRET"]!
  );

  if (event.type !== "checkout.session.completed") {
    return new Response("Webhook received", { status: 200 });
  }

  let session = event.data.object as Stripe.Checkout.Session;

  // Ensure we have the fields we need. If not, retrieve the full session from Stripe.
  if (!session.customer || !session.metadata?.["event_id"] || !session.customer_details?.email) {
    session = await stripe.checkout.sessions.retrieve(session.id);
  }

  let customerId: number;
  const email = session.customer_details?.email || (session as any).customer_email || undefined;
  if (!email) {
    throw new Error("No customer email found in session.");
  }
  const existingCustomer = db.query("SELECT id FROM customers WHERE email = ?").get(email) as { id: number } | undefined;
  if (!existingCustomer) {
    const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (!stripeCustomerId) {
      // If Stripe did not attach a customer for some reason, acknowledge the webhook to avoid retries
      // and let a later reconciliation handle it.
      console.error("Missing stripe customer id on completed session", { sessionId: session.id });
      return new Response("Webhook received", { status: 200 });
    }
    const result = db.run(
      "INSERT INTO customers (email, stripe_customer_id) VALUES (?, ?)",
      [email, stripeCustomerId]
    );
    customerId = result.lastInsertRowid as number;
  } else {
    customerId = existingCustomer.id;
  }

  const ticketId = uuid();

  const eventId = session.metadata?.["event_id"] || undefined;
  if (!eventId) {
    console.error("Missing event_id metadata on completed session", { sessionId: session.id });
    return new Response("Webhook received", { status: 200 });
  }

  db.run(
    "INSERT INTO tickets (id, event_id, customer_id, student_name, created_at) VALUES (?, ?, ?, ?, ?)",
    [
      ticketId,
      eventId,
      customerId,
      session.custom_fields?.[0]?.text?.value ?? null,
      new Date().toISOString()
    ]
  );

  await sendTicketSuccessEmail({
    studentName: session.custom_fields?.[0]?.text?.value ?? "Unknown",
    recipientEmail: session.customer_details?.email!,
    ticketId,
    eventName: session.metadata?.["event_name"]!
  });

  return new Response("Webhook received", { status: 200 });
}

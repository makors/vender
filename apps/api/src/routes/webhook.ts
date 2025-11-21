import stripe from "../stripe";
import Stripe from "stripe";
import db from "../db";
import { RedisClient } from "bun";
import { v4 as uuid } from "uuid";
import { sendTicketSuccessEmail } from "../email";

// Initialize Redis
const redis = new RedisClient("redis://redis:6379");

export default async function webhook(req: Bun.BunRequest<"/stripe/webhook">) {
  const signature = req.headers.get("stripe-signature") || "";

  // Bun optimization: use .text() instead of Buffer.from(await req.arrayBuffer())
  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      process.env["STRIPE_WEBHOOK_SECRET"]!
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err}`);
    return new Response("Webhook Error", { status: 400 });
  }

  // Filter for the specific event we care about
  if (event.type !== "checkout.session.completed") {
    return new Response("Ignored", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const idempotencyKey = `stripe:processed:${session.id}`;

  // ---------------------------------------------------------
  // 1. REDIS IDEMPOTENCY CHECK (The Guard)
  // ---------------------------------------------------------
  // SET key value NX (only if not exists) EX (expire seconds)
  // We set a 24-hour expiration. After 24h, we assume Stripe won't retry anymore.
  const isNewEvent = await redis.set(idempotencyKey, "processing");
  await redis.expire(idempotencyKey, 60 * 60 * 24 * 30); // i doubt stripe will retry after 30 days

  if (!isNewEvent) {
    console.log(
      `[Idempotency] Event ${session.id} already processed or processing.`
    );
    return new Response("Already Processed", { status: 200 });
  }

  let customerId: number = 0;

  //  --- process customer (create if not exists) ---
  try {
    // -- Validation --
    const email = session.customer_details?.email || session.customer_email;
    const eventId = session.metadata?.["event_id"];

    if (!email || !eventId) {
      // Permanent failure: Data missing. Do not retry.
      console.error("Missing critical metadata", { sessionId: session.id });
      return new Response("Missing Data", { status: 200 });
    }

    // -- Customer Upsert (SQLite) --
    // We still check DB for customer to get the ID
    const stripeCustomerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;

    // i hope this works
    const customer = db
      .query(
        "INSERT INTO customers (email, stripe_customer_id) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET stripe_customer_id = excluded.stripe_customer_id RETURNING id"
      )
      .get(email, stripeCustomerId ?? "") as { id: number };

    customerId = customer.id;
  } catch (error) {
    console.error("Processing failed:", error);

    // CRITICAL: If we failed to write to the DB, we MUST delete the Redis key.
    // This allows Stripe to retry the webhook and for us to try again.
    await redis.del(idempotencyKey);

    // Return 500 so Stripe triggers a retry schedule
    return new Response("Internal Server Error", { status: 500 });
  }

  // create ticket
  const ticketId = uuid();
  try {
    if (customerId === 0) {
      console.error("Customer ID is 0", { sessionId: session.id });
      return new Response("Customer ID is 0", { status: 500 });
    }

    db.run(
      "INSERT INTO tickets (id, event_id, customer_id, student_name, created_at) VALUES (?, ?, ?, ?, ?)",
      [
        ticketId,
        (session.metadata?.["event_id"] as string) ?? "",
        customerId,
        session.custom_fields?.[0]?.text?.value ?? null,
        new Date().toISOString(),
      ]
    );

    // we are only completed once we add the ticket to the db
    await redis.set(idempotencyKey, "completed", "KEEPTTL");
  } catch (error) {
    console.error("Ticket creation failed:", error);
    await redis.del(idempotencyKey);
    return new Response("Internal Server Error", { status: 500 });
  }

  // ---------------------------------------------------------
  // 4. SIDE EFFECTS (Email)
  // ---------------------------------------------------------
  // We run this OUTSIDE the main try/catch block that handles DB logic.
  // If the DB write succeeded, we return 200 to Stripe even if the email fails.

  const email = session.customer_details?.email || session.customer_email || "";
  const studentName = session.custom_fields?.[0]?.text?.value ?? "Student";

  // Fire and forget (or log error internally)
  sendTicketSuccessEmail({
    studentName,
    recipientEmail: email,
    ticketId: ticketId, // Note: Use the variable from above in real code
    eventName: session.metadata?.["event_name"] || "Event",
  }).catch((err) => console.error("Email failed to send", err));

  return new Response("Success", { status: 200 });
}

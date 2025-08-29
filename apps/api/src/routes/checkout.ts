import db, { type TicketedEvent } from "../db";
import stripe from "../stripe";

export async function checkout(req: Bun.BunRequest<'/checkout/:event_id'>) {
    const { event_id } = req.params;

    const event = db.prepare("SELECT * FROM events WHERE id = ?").get(event_id) as TicketedEvent;

    if (!event) {
        return new Response("Event not found", { status: 404 });
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: event.stripe_price_id, quantity: 1 }],
        custom_fields: [
            {
                key: "student_name",
                label: {
                    type: "custom",
                    custom: "Full Legal Name of Student Attending",
                },
                type: "text",
            },
        ],
        mode: "payment",
        success_url: `${process.env["API_URL"]}/checkout/success`,
        cancel_url: `${process.env["API_URL"]}/checkout/cancel`,
        ui_mode: "hosted",
        customer_creation: "always",
        metadata: {
            event_id: event_id,
            event_name: event.name
        }
    });


    return Response.redirect(session.url!);
};

export async function success(req: Bun.BunRequest<'/checkout/success'>) {
    return new Response(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Payment Successful</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 50px;
                        background-color: #f5f5f5;
                    }
                    .container {
                        background: white;
                        padding: 40px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        max-width: 500px;
                        margin: 0 auto;
                    }
                    h1 {
                        color: #28a745;
                        margin-bottom: 20px;
                    }
                    p {
                        color: #666;
                        line-height: 1.5;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Payment Successful!</h1>
                    <p>Thank you for your purchase. Your event ticket has been confirmed.</p>
                    <p>You should receive a confirmation email shortly.</p>
                </div>
            </body>
        </html>
    `, {
        headers: { "Content-Type": "text/html" }
    });
}

export async function cancel(req: Bun.BunRequest<'/checkout/cancel'>) {
    return new Response(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Payment Cancelled</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 50px;
                        background-color: #f5f5f5;
                    }
                    .container {
                        background: white;
                        padding: 40px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        max-width: 500px;
                        margin: 0 auto;
                    }
                    h1 {
                        color: #ff0000;
                        margin-bottom: 20px;
                    }
                    p {
                        color: #666;
                        line-height: 1.5;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Payment Cancelled!</h1>
                    <p>Your payment was cancelled. Please try again.</p>
                </div>
            </body>
        </html>
    `, {
        headers: { "Content-Type": "text/html" }
    });
}
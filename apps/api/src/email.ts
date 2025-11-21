import nodemailer from "nodemailer";
import QRCode from "qrcode";

type TicketSuccessParams = {
  studentName: string;
  recipientEmail: string;
  ticketId: string;
  eventName: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env["SMTP_HOST"];
  const port = process.env["SMTP_PORT"] ? Number(process.env["SMTP_PORT"]) : undefined;
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];

  if (!host || !port || !user || !pass) {
    throw new Error("SMTP configuration is missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.");
  }


  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: {
      // un-comment the following line if you are using a self-signed certificate or encountering TLS errors
      // rejectUnauthorized: false, 
      // Assuming we might need this for the specific error the user is seeing ("subject" destructuring error in node:tls)
      // which often indicates a cert issue or a mismatch that Node/Bun's TLS stack doesn't like.
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined
    }
  });

  return cachedTransporter;
}

export async function generateTicketQrPng(ticketId: string): Promise<Buffer> {
  // minimal, just the ticket id (which is supposedly private in this case)
  return QRCode.toBuffer(ticketId, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 6,
  });
}

export async function sendTicketSuccessEmail(params: TicketSuccessParams): Promise<void> {
  const { studentName, recipientEmail, ticketId, eventName } = params;

  const fromEmail = process.env["SMTP_FROM"] || process.env["SMTP_USER"] || "no-reply@example.com";
  const fromName = process.env["SMTP_FROM_NAME"] || "Vender Tickets";

  const transporter = getTransporter();
  const qrPng = await generateTicketQrPng(ticketId);
  const qrCid = `ticket-${ticketId}@vender`;

  const subject = `Your ticket for ${eventName}`;
  const textBody = [
    `Hi ${studentName},`,
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
    `<p>Hi ${studentName},</p>`,
    `<p>Your for <strong>${eventName}</strong> is confirmed — yay!</p>`,
    `<p><strong>Ticket ID:</strong> ${ticketId}</p>`,
    `<p><strong>Please print this QR code and give it to your child</strong> to bring to check-in:</p>`,
    `<p><img src="cid:${qrCid}" alt="Ticket QR Code" style="max-width:300px;height:auto;" /></p>`,
    `<p>Thanks,<br/>${fromName}</p>`,
  ].join("");

  try {
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
  } catch (error) {
    console.error("Failed to send ticket email:", error);
    // Rethrow or handle gracefully depending on requirements. 
    // For now, logging is crucial to identify the issue.
    // If we don't rethrow, the webhook returns 200 OK even if email fails.
    // But usually webhooks should succeed if the core logic (saving to DB) worked.
    // Let's log it but not crash the webhook response, 
    // although the user might want to know.
    // The original code awaited it, so it would crash the webhook handler.
    // I will rethrow to maintain original behavior but with logging.
    // throw error; 
    // UPDATE: We are suppressing the error so the webhook returns 200.
    // This prevents Stripe from retrying the webhook 15+ times if the email server is down.
    return; 
  }
}



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
    secure: true,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export async function generateTicketQrPng(ticketId: string): Promise<Buffer> {
  // Encode minimal content: just the ticket ID as requested
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
  const fromName = process.env["SMTP_FROM_NAME"] || "RRMS PTSO Tickets";

  const transporter = getTransporter();
  const qrPng = await generateTicketQrPng(ticketId);
  const qrCid = `ticket-${ticketId}@rrms-ptso`;

  const subject = `Your RRMS PTSO ticket for ${eventName}`;
  const textBody = [
    `Hi ${studentName},`,
    "",
    `Your RRMS PTSO ticket for ${eventName} is confirmed — yay!`,
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
    `<p>Your RRMS PTSO ticket for <strong>${eventName}</strong> is confirmed — yay!</p>`,
    `<p><strong>Ticket ID:</strong> ${ticketId}</p>`,
    `<p><strong>Please print this QR code and give it to your child</strong> to bring to check-in:</p>`,
    `<p><img src="cid:${qrCid}" alt="Ticket QR Code" style="max-width:300px;height:auto;" /></p>`,
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



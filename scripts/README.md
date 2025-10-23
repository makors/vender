# Vender Scripts

Utility scripts for managing the Vender ticket system.

## Available Scripts

### Ticket Management Console

Interactive CLI tool for managing tickets, customers, and events manually.

```bash
cd scripts
bun run manage
```

**Features:**

🎫 **Ticket Operations:**
- List all tickets
- Add ticket manually (bypass Stripe checkout)
- Remove/Delete tickets
- Check detailed ticket status
- Reset ticket scan status (mark as unscanned)
- List tickets by event
- List tickets by customer

👥 **Customer Operations:**
- List all customers
- Add customer manually
- Remove customer (and associated tickets)

🎪 **Event Operations:**
- List all events with ticket statistics

### Create Event

Create a new event with Stripe integration.

```bash
cd scripts
bun run create-event
```

### View Events

View all existing events.

```bash
cd scripts
bun run view-events
```

### Send Ticket Reminder Emails

Send reminder emails with QR codes to customers who haven't scanned their tickets yet.

```bash
cd scripts
bun run send-reminders
```

**Features:**
- Send reminders for all unscanned tickets
- Send reminders for a specific event
- Preview unscanned tickets before sending
- Send reminder for a specific ticket by ID

**Requirements:** SMTP configuration must be set via environment variables. See [REMINDER_EMAILS.md](./REMINDER_EMAILS.md) for detailed setup instructions.

## Usage

All scripts should be run from the `scripts` directory and will automatically connect to the database at `../data/vender.db`.

Make sure you have Bun installed and the database exists before running these scripts.

### Email Configuration

For the reminder email script, you need to set SMTP environment variables:

```bash
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="465"
export SMTP_USER="your@email.com"
export SMTP_PASS="your-password"
export SMTP_FROM="noreply@yourdomain.com"  # Optional
export SMTP_FROM_NAME="Vender Tickets"     # Optional
```

See [REMINDER_EMAILS.md](./REMINDER_EMAILS.md) for complete documentation.

# Ticket Reminder Email Script

This script sends reminder emails to customers with unscanned tickets, including their ticket QR codes for printing.

## Prerequisites

Before running the script, you need to configure SMTP settings for sending emails. Set the following environment variables:

```bash
export SMTP_HOST="your.smtp.host"        # e.g., smtp.gmail.com
export SMTP_PORT="465"                    # Usually 465 for secure SMTP
export SMTP_USER="your@email.com"        # Your SMTP username
export SMTP_PASS="your-password"         # Your SMTP password
export SMTP_FROM="noreply@yourdomain.com"  # Optional: From email address
export SMTP_FROM_NAME="Vender Tickets"    # Optional: From name
```

## Installation

Install dependencies:

```bash
cd scripts
bun install
```

## Usage

Run the script:

```bash
cd scripts
bun run send-reminders
```

Or from the project root:

```bash
bun --cwd scripts run send-reminders
```

## Features

The script provides an interactive menu with the following options:

1. **Send reminders for all unscanned tickets** - Sends emails to all customers with unscanned tickets
2. **Send reminders for a specific event** - Choose an event and send reminders only to customers with unscanned tickets for that event
3. **Preview unscanned tickets** - View a list of all unscanned tickets without sending emails (useful for checking before sending)
4. **Send reminder for a specific ticket** - Send a reminder email for a single ticket by ticket ID

## Email Content

The reminder email includes:
- A friendly reminder message
- The event name
- The ticket ID
- An embedded QR code image (can be printed)
- The QR code is also attached as a PNG file

## Notes

- Only unscanned tickets will be included in the reminder list
- Each customer will receive one email per ticket they own
- The script will ask for confirmation before sending emails
- Failed emails will be logged, and a summary will be shown at the end
- You can run this script multiple times safely - customers who already received reminders will get them again if their tickets are still unscanned

## Example Workflow

1. Run the script: `bun run send-reminders`
2. Choose option 3 to preview unscanned tickets
3. Review the list to ensure everything looks correct
4. Choose option 1 or 2 to send reminders
5. Confirm when prompted
6. Review the summary to see which emails were sent successfully

## Troubleshooting

### SMTP Configuration Error
If you see "SMTP configuration is missing", make sure all required environment variables are set:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

### Email Sending Failures
- Check that your SMTP credentials are correct
- Verify that your email provider allows SMTP access
- If using Gmail, you may need to use an "App Password" instead of your regular password
- Check your firewall/network settings to ensure outbound SMTP connections are allowed

### Database Connection Issues
The script expects the database to be at `../data/vender.db` relative to the scripts directory. Make sure you're running the script from the correct location.


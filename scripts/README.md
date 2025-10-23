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

## Usage

All scripts should be run from the `scripts` directory and will automatically connect to the database at `../data/vender.db`.

Make sure you have Bun installed and the database exists before running these scripts.

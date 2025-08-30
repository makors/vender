import { Database } from "bun:sqlite";

const db = new Database("./data/vender.db");

type TicketedEvent = {
    id: string;
    name: string;
    stripe_price_id: string;
    created_at: string;
    updated_at: string;
};

db.run(`
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        stripe_price_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        event_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        student_name TEXT,
        scanned_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        stripe_customer_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

export default db;
export type { TicketedEvent };
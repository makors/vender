import { Database } from "bun:sqlite";
import { v4 as uuidv4 } from "uuid";

// assuming everything exists
const db = new Database("./data/vender.db");

const name = prompt("what is the name of the event?");
const stripe_price_id = prompt("what is the stripe price id?");

db.run(`
    INSERT INTO events (id, name, stripe_price_id) VALUES (?, ?, ?)
`, [uuidv4(), name, stripe_price_id]);

console.log("event created, here are the current events:");

console.log(db.prepare("SELECT * FROM events").all());
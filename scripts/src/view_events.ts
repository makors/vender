import { Database } from "bun:sqlite";
import { v4 as uuidv4 } from "uuid";

// assuming everything exists
const db = new Database("../data/vender.db");

console.log("remember that the url for events is https://<url>/checkout/<id> for checking out");
console.table(db.prepare("SELECT * FROM events").all());
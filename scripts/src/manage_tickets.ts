import { Database } from "bun:sqlite";
import { v4 as uuidv4 } from "uuid";

const db = new Database("../data/vender.db");

type Ticket = {
    id: string;
    event_id: string;
    customer_id: number;
    student_name: string | null;
    scanned_at: string | null;
    created_at: string;
};

type Customer = {
    id: number;
    email: string;
    stripe_customer_id: string;
    created_at: string;
};

type Event = {
    id: string;
    name: string;
    stripe_price_id: string;
    created_at: string;
    updated_at: string;
};

function printMenu() {
    console.log("\n╔════════════════════════════════════════════╗");
    console.log("║     TICKET MANAGEMENT CONSOLE              ║");
    console.log("╚════════════════════════════════════════════╝");
    console.log("\n🎫 Ticket Operations:");
    console.log("  1. List all tickets");
    console.log("  2. Add ticket manually");
    console.log("  3. Remove/Delete ticket");
    console.log("  4. Check ticket status");
    console.log("  5. Reset ticket scan (mark as unscanned)");
    console.log("  6. List tickets by event");
    console.log("  7. List tickets by customer");
    console.log("\n👥 Customer Operations:");
    console.log("  8. List all customers");
    console.log("  9. Add customer manually");
    console.log("  10. Remove customer");
    console.log("\n🎪 Event Operations:");
    console.log("  11. List all events");
    console.log("\n  0. Exit");
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

function formatTicket(ticket: Ticket, includeCustomer = true): string {
    let info = `\n┌─────────────────────────────────────────┐\n`;
    info += `│ Ticket ID: ${ticket.id}\n`;
    info += `│ Event ID: ${ticket.event_id}\n`;
    
    if (includeCustomer) {
        const customer = db.query("SELECT email FROM customers WHERE id = ?")
            .get(ticket.customer_id) as { email: string } | undefined;
        info += `│ Customer: ${customer?.email || 'Unknown'} (ID: ${ticket.customer_id})\n`;
    } else {
        info += `│ Customer ID: ${ticket.customer_id}\n`;
    }
    
    info += `│ Student Name: ${ticket.student_name || 'N/A'}\n`;
    info += `│ Status: ${ticket.scanned_at ? `✓ SCANNED (${ticket.scanned_at})` : '⭘ NOT SCANNED'}\n`;
    info += `│ Created: ${ticket.created_at}\n`;
    info += `└─────────────────────────────────────────┘`;
    return info;
}

function listAllTickets() {
    console.log("\n📋 ALL TICKETS:");
    const tickets = db.query("SELECT * FROM tickets ORDER BY created_at DESC").all() as Ticket[];
    
    if (tickets.length === 0) {
        console.log("  No tickets found.");
        return;
    }
    
    console.log(`  Total: ${tickets.length} tickets\n`);
    tickets.forEach(ticket => console.log(formatTicket(ticket)));
}

function addTicketManually() {
    console.log("\n➕ ADD TICKET MANUALLY");
    
    // List events
    const events = db.query("SELECT * FROM events").all() as Event[];
    if (events.length === 0) {
        console.log("  ❌ No events found. Create an event first.");
        return;
    }
    
    console.log("\n📅 Available Events:");
    events.forEach((event, idx) => {
        console.log(`  ${idx + 1}. ${event.name} (ID: ${event.id})`);
    });
    
    const eventChoice = prompt("\nSelect event number:");
    const eventIdx = parseInt(eventChoice || "0") - 1;
    
    if (eventIdx < 0 || eventIdx >= events.length) {
        console.log("  ❌ Invalid event selection.");
        return;
    }
    
    const selectedEvent = events[eventIdx];
    
    // List customers
    const customers = db.query("SELECT * FROM customers").all() as Customer[];
    if (customers.length === 0) {
        console.log("  ❌ No customers found. Add a customer first.");
        return;
    }
    
    console.log("\n👥 Available Customers:");
    customers.forEach((customer, idx) => {
        console.log(`  ${idx + 1}. ${customer.email} (ID: ${customer.id})`);
    });
    
    const customerChoice = prompt("\nSelect customer number (or 0 to create new):");
    let customerId: number;
    
    if (customerChoice === "0") {
        const email = prompt("Enter customer email:");
        if (!email) {
            console.log("  ❌ Email is required.");
            return;
        }
        
        const stripeCustomerId = prompt("Enter Stripe customer ID (or leave empty for manual-):") || `manual-${uuidv4()}`;
        
        const result = db.run(
            "INSERT INTO customers (email, stripe_customer_id) VALUES (?, ?)",
            [email, stripeCustomerId]
        );
        customerId = result.lastInsertRowid as number;
        console.log(`  ✓ Customer created with ID: ${customerId}`);
    } else {
        const customerIdx = parseInt(customerChoice || "0") - 1;
        
        if (customerIdx < 0 || customerIdx >= customers.length) {
            console.log("  ❌ Invalid customer selection.");
            return;
        }
        
        customerId = customers[customerIdx]!.id;
    }
    
    const studentName = prompt("Enter student name (optional):") || null;
    
    const ticketId = uuidv4();
    
    db.run(
        "INSERT INTO tickets (id, event_id, customer_id, student_name, created_at) VALUES (?, ?, ?, ?, ?)",
        [ticketId, selectedEvent!.id, customerId, studentName, new Date().toISOString()]
    );
    
    console.log(`\n  ✅ Ticket created successfully!`);
    console.log(`  Ticket ID: ${ticketId}`);
    console.log(`  Event: ${selectedEvent!.name}`);
    console.log(`  Customer ID: ${customerId}`);
    console.log(`  Student Name: ${studentName || 'N/A'}`);
}

function removeTicket() {
    console.log("\n🗑️  REMOVE TICKET");
    
    const ticketId = prompt("Enter ticket ID to remove:");
    if (!ticketId) {
        console.log("  ❌ Ticket ID is required.");
        return;
    }
    
    const ticket = db.query("SELECT * FROM tickets WHERE id = ?").get(ticketId) as Ticket | undefined;
    
    if (!ticket) {
        console.log(`  ❌ Ticket with ID '${ticketId}' not found.`);
        return;
    }
    
    console.log(formatTicket(ticket));
    
    const confirm = prompt("\n⚠️  Are you sure you want to delete this ticket? (yes/no):");
    
    if (confirm?.toLowerCase() !== "yes") {
        console.log("  ❌ Cancelled.");
        return;
    }
    
    db.run("DELETE FROM tickets WHERE id = ?", [ticketId]);
    console.log(`  ✅ Ticket ${ticketId} deleted successfully.`);
}

function checkTicketStatus() {
    console.log("\n🔍 CHECK TICKET STATUS");
    
    const ticketId = prompt("Enter ticket ID:");
    if (!ticketId) {
        console.log("  ❌ Ticket ID is required.");
        return;
    }
    
    const row = db.query(`
        SELECT t.*, c.email, c.stripe_customer_id, e.name as event_name
        FROM tickets t
        JOIN customers c ON c.id = t.customer_id
        JOIN events e ON e.id = t.event_id
        WHERE t.id = ?
    `).get(ticketId) as (Ticket & { email: string; stripe_customer_id: string; event_name: string }) | undefined;
    
    if (!row) {
        console.log(`  ❌ Ticket with ID '${ticketId}' not found.`);
        return;
    }
    
    console.log("\n┌─────────────────────────────────────────┐");
    console.log("│         TICKET DETAILS                  │");
    console.log("├─────────────────────────────────────────┤");
    console.log(`│ Ticket ID: ${row.id}`);
    console.log(`│ Event: ${row.event_name}`);
    console.log(`│ Event ID: ${row.event_id}`);
    console.log(`├─────────────────────────────────────────┤`);
    console.log(`│ Customer Email: ${row.email}`);
    console.log(`│ Customer ID: ${row.customer_id}`);
    console.log(`│ Stripe Customer ID: ${row.stripe_customer_id}`);
    console.log(`├─────────────────────────────────────────┤`);
    console.log(`│ Student Name: ${row.student_name || 'N/A'}`);
    console.log(`├─────────────────────────────────────────┤`);
    console.log(`│ Scan Status: ${row.scanned_at ? '✓ SCANNED' : '⭘ NOT SCANNED'}`);
    if (row.scanned_at) {
        console.log(`│ Scanned At: ${row.scanned_at}`);
    }
    console.log(`├─────────────────────────────────────────┤`);
    console.log(`│ Created: ${row.created_at}`);
    console.log("└─────────────────────────────────────────┘");
}

function resetTicketScan() {
    console.log("\n🔄 RESET TICKET SCAN");
    
    const ticketId = prompt("Enter ticket ID to reset:");
    if (!ticketId) {
        console.log("  ❌ Ticket ID is required.");
        return;
    }
    
    const ticket = db.query("SELECT * FROM tickets WHERE id = ?").get(ticketId) as Ticket | undefined;
    
    if (!ticket) {
        console.log(`  ❌ Ticket with ID '${ticketId}' not found.`);
        return;
    }
    
    if (!ticket.scanned_at) {
        console.log(`  ℹ️  Ticket is already not scanned.`);
        return;
    }
    
    console.log(formatTicket(ticket));
    
    const confirm = prompt("\nReset this ticket's scan status? (yes/no):");
    
    if (confirm?.toLowerCase() !== "yes") {
        console.log("  ❌ Cancelled.");
        return;
    }
    
    db.run("UPDATE tickets SET scanned_at = NULL WHERE id = ?", [ticketId]);
    console.log(`  ✅ Ticket ${ticketId} scan status reset successfully.`);
}

function listTicketsByEvent() {
    console.log("\n🎪 LIST TICKETS BY EVENT");
    
    const events = db.query("SELECT * FROM events").all() as Event[];
    if (events.length === 0) {
        console.log("  ❌ No events found.");
        return;
    }
    
    console.log("\n📅 Available Events:");
    events.forEach((event, idx) => {
        console.log(`  ${idx + 1}. ${event.name} (ID: ${event.id})`);
    });
    
    const eventChoice = prompt("\nSelect event number:");
    const eventIdx = parseInt(eventChoice || "0") - 1;
    
    if (eventIdx < 0 || eventIdx >= events.length) {
        console.log("  ❌ Invalid event selection.");
        return;
    }
    
    const selectedEvent = events[eventIdx];
    
    const tickets = db.query("SELECT * FROM tickets WHERE event_id = ? ORDER BY created_at DESC")
        .all(selectedEvent!.id) as Ticket[];
    
    console.log(`\n📋 Tickets for Event: ${selectedEvent!.name}`);
    console.log(`  Total: ${tickets.length} tickets`);
    
    const scanned = tickets.filter(t => t.scanned_at).length;
    const unscanned = tickets.length - scanned;
    console.log(`  Scanned: ${scanned} | Unscanned: ${unscanned}\n`);
    
    if (tickets.length === 0) {
        console.log("  No tickets found for this event.");
        return;
    }
    
    tickets.forEach(ticket => console.log(formatTicket(ticket)));
}

function listTicketsByCustomer() {
    console.log("\n👤 LIST TICKETS BY CUSTOMER");
    
    const customers = db.query("SELECT * FROM customers").all() as Customer[];
    if (customers.length === 0) {
        console.log("  ❌ No customers found.");
        return;
    }
    
    console.log("\n👥 Available Customers:");
    customers.forEach((customer, idx) => {
        console.log(`  ${idx + 1}. ${customer.email} (ID: ${customer.id})`);
    });
    
    const customerChoice = prompt("\nSelect customer number:");
    const customerIdx = parseInt(customerChoice || "0") - 1;
    
    if (customerIdx < 0 || customerIdx >= customers.length) {
        console.log("  ❌ Invalid customer selection.");
        return;
    }
    
    const selectedCustomer = customers[customerIdx];
    
    const tickets = db.query("SELECT * FROM tickets WHERE customer_id = ? ORDER BY created_at DESC")
        .all(selectedCustomer!.id) as Ticket[];
    
    console.log(`\n📋 Tickets for Customer: ${selectedCustomer!.email}`);
    console.log(`  Total: ${tickets.length} tickets\n`);
    
    if (tickets.length === 0) {
        console.log("  No tickets found for this customer.");
        return;
    }
    
    tickets.forEach(ticket => console.log(formatTicket(ticket, false)));
}

function listAllCustomers() {
    console.log("\n👥 ALL CUSTOMERS:");
    const customers = db.query("SELECT * FROM customers ORDER BY created_at DESC").all() as Customer[];
    
    if (customers.length === 0) {
        console.log("  No customers found.");
        return;
    }
    
    console.log(`  Total: ${customers.length} customers\n`);
    
    customers.forEach(customer => {
        const ticketCount = (db.query("SELECT COUNT(*) as count FROM tickets WHERE customer_id = ?")
            .get(customer.id) as { count: number }).count;
        
        console.log("\n┌─────────────────────────────────────────┐");
        console.log(`│ Customer ID: ${customer.id}`);
        console.log(`│ Email: ${customer.email}`);
        console.log(`│ Stripe ID: ${customer.stripe_customer_id}`);
        console.log(`│ Tickets: ${ticketCount}`);
        console.log(`│ Created: ${customer.created_at}`);
        console.log("└─────────────────────────────────────────┘");
    });
}

function addCustomerManually() {
    console.log("\n➕ ADD CUSTOMER MANUALLY");
    
    const email = prompt("Enter customer email:");
    if (!email) {
        console.log("  ❌ Email is required.");
        return;
    }
    
    // Check if customer already exists
    const existing = db.query("SELECT * FROM customers WHERE email = ?").get(email) as Customer | undefined;
    if (existing) {
        console.log(`  ❌ Customer with email '${email}' already exists (ID: ${existing.id}).`);
        return;
    }
    
    const stripeCustomerId = prompt("Enter Stripe customer ID (or leave empty for manual-):") || `manual-${uuidv4()}`;
    
    const result = db.run(
        "INSERT INTO customers (email, stripe_customer_id) VALUES (?, ?)",
        [email, stripeCustomerId]
    );
    
    const customerId = result.lastInsertRowid as number;
    
    console.log(`\n  ✅ Customer created successfully!`);
    console.log(`  Customer ID: ${customerId}`);
    console.log(`  Email: ${email}`);
    console.log(`  Stripe ID: ${stripeCustomerId}`);
}

function removeCustomer() {
    console.log("\n🗑️  REMOVE CUSTOMER");
    
    const customers = db.query("SELECT * FROM customers").all() as Customer[];
    if (customers.length === 0) {
        console.log("  ❌ No customers found.");
        return;
    }
    
    console.log("\n👥 Available Customers:");
    customers.forEach((customer, idx) => {
        const ticketCount = (db.query("SELECT COUNT(*) as count FROM tickets WHERE customer_id = ?")
            .get(customer.id) as { count: number }).count;
        console.log(`  ${idx + 1}. ${customer.email} (ID: ${customer.id}) - ${ticketCount} tickets`);
    });
    
    const customerChoice = prompt("\nSelect customer number to remove:");
    const customerIdx = parseInt(customerChoice || "0") - 1;
    
    if (customerIdx < 0 || customerIdx >= customers.length) {
        console.log("  ❌ Invalid customer selection.");
        return;
    }
    
    const selectedCustomer = customers[customerIdx]!;
    
    const ticketCount = (db.query("SELECT COUNT(*) as count FROM tickets WHERE customer_id = ?")
        .get(selectedCustomer.id) as { count: number }).count;
    
    if (ticketCount > 0) {
        console.log(`\n  ⚠️  Warning: This customer has ${ticketCount} ticket(s).`);
        console.log(`  Deleting the customer will also delete all associated tickets.`);
    }
    
    const confirm = prompt("\n⚠️  Are you sure you want to delete this customer? (yes/no):");
    
    if (confirm?.toLowerCase() !== "yes") {
        console.log("  ❌ Cancelled.");
        return;
    }
    
    // Delete associated tickets first (due to foreign key constraint)
    db.run("DELETE FROM tickets WHERE customer_id = ?", [selectedCustomer.id]);
    db.run("DELETE FROM customers WHERE id = ?", [selectedCustomer.id]);
    
    console.log(`  ✅ Customer and ${ticketCount} associated ticket(s) deleted successfully.`);
}

function listAllEvents() {
    console.log("\n🎪 ALL EVENTS:");
    const events = db.query("SELECT * FROM events ORDER BY created_at DESC").all() as Event[];
    
    if (events.length === 0) {
        console.log("  No events found.");
        return;
    }
    
    console.log(`  Total: ${events.length} events\n`);
    
    events.forEach(event => {
        const ticketCount = (db.query("SELECT COUNT(*) as count FROM tickets WHERE event_id = ?")
            .get(event.id) as { count: number }).count;
        const scannedCount = (db.query("SELECT COUNT(*) as count FROM tickets WHERE event_id = ? AND scanned_at IS NOT NULL")
            .get(event.id) as { count: number }).count;
        
        console.log("\n┌─────────────────────────────────────────┐");
        console.log(`│ Event: ${event.name}`);
        console.log(`│ ID: ${event.id}`);
        console.log(`│ Stripe Price ID: ${event.stripe_price_id}`);
        console.log(`│ Tickets: ${ticketCount} (${scannedCount} scanned)`);
        console.log(`│ Created: ${event.created_at}`);
        console.log(`│ Updated: ${event.updated_at}`);
        console.log("└─────────────────────────────────────────┘");
    });
}

function main() {
    while (true) {
        printMenu();
        const choice = prompt("\nEnter your choice:");
        
        try {
            switch (choice) {
                case "1":
                    listAllTickets();
                    break;
                case "2":
                    addTicketManually();
                    break;
                case "3":
                    removeTicket();
                    break;
                case "4":
                    checkTicketStatus();
                    break;
                case "5":
                    resetTicketScan();
                    break;
                case "6":
                    listTicketsByEvent();
                    break;
                case "7":
                    listTicketsByCustomer();
                    break;
                case "8":
                    listAllCustomers();
                    break;
                case "9":
                    addCustomerManually();
                    break;
                case "10":
                    removeCustomer();
                    break;
                case "11":
                    listAllEvents();
                    break;
                case "0":
                    console.log("\n👋 Goodbye!\n");
                    process.exit(0);
                default:
                    console.log("\n  ❌ Invalid choice. Please try again.");
            }
        } catch (error) {
            console.error("\n  ❌ Error:", error);
        }
        
        prompt("\nPress Enter to continue...");
    }
}

main();


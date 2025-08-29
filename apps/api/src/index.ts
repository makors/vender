import "./db"; // get it to init
import { checkout, success, cancel } from "./routes/checkout";
import webhook from "./routes/webhook";
import { scan } from "./routes/scan";
import { lookup } from "./routes/lookup";

Bun.serve({
  port: 3001,
  routes: {
    "/": Response.redirect("https://ronaldreaganms.pwcs.edu"),
    "/checkout/:event_id": checkout,
    "/checkout/success": success,
    "/checkout/cancel": cancel,
    "/stripe/webhook": webhook,
    "/scan": scan,
    "/lookup": lookup,
  },
});

console.log("api server is running on port 3001");
# Vender Ticket Scanner Web

A mobile-first Next.js interface for securely scanning barcodes and QR codes against Vender events. The app mirrors the monorepo structure used by the CLI scanner while delivering a camera-powered experience for on-site teams.

## Features

- 🔐 **Access gate** – lock the scanner behind a rotating code shared with trusted teammates only.
- 📷 **Live camera scanning** – leverage the device camera with a high-contrast frame for quick reads.
- 🧠 **Smart automations** – optional clipboard auto-copy, haptic feedback, and manual overrides.
- 📊 **Session insights** – keep tabs on cleared vs. pending tickets and review a rich scan history.

## Getting started

Install dependencies at the repo root (Bun manages all workspaces):

```bash
bun install
```

Run the web scanner in development mode:

```bash
bun --filter @vender/scanner-web run dev
```

Build for production:

```bash
bun --filter @vender/scanner-web run build
```

## Configuration

Set an access code so only authorized staff can unlock the scanner. Without configuration the app falls back to `vender-demo` for local testing.

```bash
# .env.local (inside apps/scanner-web)
SCANNER_ACCESS_CODE=your-shared-secret
```

> The code never ships to the client; it is validated on the server and stored in an HTTP-only cookie.

For the best camera support deploy the app over HTTPS (required by iOS Safari for continuous scanning).

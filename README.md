# vender
The simplest way to manage tickets for your events.

> [!TIP]
> Want to use a fully featured app for event ticketing? Check out [ticketize](https://github.com/makors/ticketize).

## Features
- **Simple ticket scanning**: Validate tickets with QR codes or ticket IDs
- **Stripe integration**: Secure payment processing for ticket sales
- **Real-time ticket lookup**: Search and verify ticket information
- **Event management**: Handle multiple events with unique checkout flows
- **Interactive scanner app**: Command-line tool for ticket validation at events
- **Web scanner console**: Secure, mobile-friendly Next.js interface with camera scanning and duplicate protection
- **Webhook support**: Automatic ticket creation upon successful payments
- **Student name tracking**: Optional student information for educational events
- **Duplicate scan prevention**: Prevents tickets from being scanned multiple times

## Prerequisites
- Stripe Account (for payments)
- Docker
- Bun
- Node.js

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/makors/vender.git
   cd vender
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Stripe secret key and other required variables.

4. Start the API server:
   ```bash
   cd apps/api
   docker compose up -d
   ```

5. In another terminal, run the scanner app:
   ```bash
   cd apps/scanner-app
   bun run scan
   ```

The API server will be available at `http://localhost:3001` and the scanner app will start in interactive mode.

6. Launch the web scanner (after configuring `apps/scanner-web/.env.local` with `SCANNER_ACCESS_CODE`):
   ```bash
   bun workspace @vender/scanner-web run dev
   ```
   Visit `http://localhost:3000` and enter the shared access code to unlock the scanner UI.

## NPM
Our npm package is [vender](https://www.npmjs.com/package/vender).

## Contributing
Open a PR!
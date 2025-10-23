# Vender Scanner Web

A secure, mobile-friendly ticket scanning console built with Next.js and shadcn UI. This app mirrors the CLI workflow but adds a modern camera-based barcode reader with duplicate protection, haptic/audio feedback, and manual overrides.

## Getting started

```bash
# from the repository root
cp apps/scanner-web/.env.example apps/scanner-web/.env.local
# edit .env.local and set SCANNER_ACCESS_CODE to the secret you share with staff

bun install
bun workspace @vender/scanner-web run dev
```

The scanner runs on <http://localhost:3000> by default. Enter your access code to unlock the console. Sessions last for 12 hours and are stored in an http-only cookie that is validated on the server for every page.

## Commands

- `bun workspace @vender/scanner-web run dev` – start the development server
- `bun workspace @vender/scanner-web run build` – create an optimized production build
- `bun workspace @vender/scanner-web run start` – start the production server (after building)
- `bun workspace @vender/scanner-web run lint` – run linting
- `bun workspace @vender/scanner-web run typecheck` – run TypeScript checks

## Features

- **Secure access** – users must enter the shared access code which is validated via an http-only cookie and server-side checks.
- **Camera scanning** – optimized for mobile devices with live previews, pause/resume, and camera switching when multiple sensors are available.
- **Duplicate detection** – recent scans are tracked and flagged instantly to prevent re-use of tickets.
- **Manual overrides** – fallback form keeps damaged tickets flowing while still applying duplicate checks.
- **Operator-friendly UI** – audio chimes, vibration feedback, and large tap targets keep scanning quick in the field.

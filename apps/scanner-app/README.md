Vender Scanner CLI
===================

Install
-------

Global install:

```bash
npm install -g @vender/scanner-app
```

Or use npx without installing:

```bash
npx @vender/scanner-app --help
```

Usage
-----

The CLI talks to the Vender API. Ensure the API is running (Docker compose provided in the repo) and set `API_URL` if it's not `http://localhost:3001`.

```bash
# default API at http://localhost:3001
vender

# custom API
API_URL=http://your-api:3001 vender

# pass an argument (ticket id, name or email) for one-off run
vender "john@example.com"
```

Notes
-----

- API is containerized; run `docker compose up -d api` from the repo root.
- The CLI requires Node 18+.


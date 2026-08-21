# Ecco Qua

Buy it in the shop, pay once at the till, walk out empty-handed — it
arrives by courier a day or two later. Built for small independent shops
(outlets, secondhand, designer) selling items too bulky to carry home on
public transit, without needing POS or courier API integration.

## Stack

- **Runtime:** Bun
- **Server:** Hono
- **DB:** PostgreSQL (`postgres` / postgres.js client)
- **Frontend:** Datastar (planned — not wired up yet)

## Getting started

```bash
bun install
```

Set your database connection:

```bash
export DATABASE_URL=postgres://<user>:<pass>@localhost:5432/<db>
```

Run the dev server:

```bash
bun run src/index.ts
```

Visit `http://localhost:3000/s/<shop-id>` using an id from your local
`shops` table.

## Current state

- [x] Postgres connection wired up
- [x] `GET /s/:shopId` - opens the shop page to enter the phone number
- [ ] `POST /s/:shopId/customer` - starts the customer journey
- [ ] Datastar on the frontend
- [ ] Customer entry flow (phone → address → tier selection)
- [ ] Staff dashboard (live queue via SSE)
- [ ] Session/lead expiry cleanup job

## Notes

- No payment processing in the app — the customer pays once, at the
  shop's own till, for item + delivery together.
- No courier API integration in v1 — shop staff book couriers manually.
- Full delivery address should only ever be shown to staff at the point
  of booking a courier, not on any general-purpose dashboard view.
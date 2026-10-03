# Ecco Qua

Buy it in the shop, pay once at the till, walk out empty-handed — it
arrives by courier a day or two later. Built for small independent shops
(outlets, secondhand, designer) selling items too bulky to carry home on
public transit, without needing POS or courier API integration.

## Stack

- **Runtime:** Bun
- **Server:** Hono
- **DB:** PostgreSQL (`postgres` / postgres.js client), migrations via Flyway
- **SQL checking:** [SafeQL](https://safeql.dev) — every `` sql`...` `` query
  is checked against the real schema at lint time, and its result type is
  generated from it
- **Frontend:** Datastar (planned — not wired up yet)

## Getting started

All tooling (bun, flyway, node, psql) comes from [devbox](https://www.jetify.com/devbox);
nothing needs to be installed globally except devbox itself and Docker.

```bash
devbox run db:up      # start Postgres (docker compose, port 5552)
devbox run db:reset   # clean, migrate and seed the dev DB
devbox run -- bun install
devbox run dev        # http://localhost:3000
```

`devbox shell` gives you a shell with all the tools and the `PG*` /
`DATABASE_URL` variables set, so `psql` and `flyway` work directly.

Visit `http://localhost:3000/s/<shop-id>` using an id from the `shops` table
(`psql -c 'select id, name from shops'`).

## Checking SQL

```bash
devbox run lint                  # check all queries against db/migrations
devbox run -- bunx eslint src --fix  # write/refresh the sql<...> result types
```

SafeQL builds a throwaway `safeql_shadow` database from `db/migrations`, so
Postgres must be running (`db:up`), but the dev DB's contents don't matter.
Write a query without a type parameter and `--fix` will fill it in; after a
schema change, lint fails until the types match again.

TypeScript is pinned to 6.0: typescript-eslint (which SafeQL needs) does not
support TypeScript 7 yet.

## Current state

- [x] Postgres connection wired up
- [x] `GET /s/:shopId` - opens the shop page to enter the phone number
- [x] `POST /s/:shopId/customer` - starts the customer journey
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
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
- **Frontend:** [Datastar](https://data-star.dev) 1.0.4 (from the CDN) with
  server-rendered Hono JSX; live views over SSE

## Live updates

A trigger on `deliveries` sends `pg_notify('delivery_changed', …)` on every
insert/update. Each server holds one `LISTEN` connection (`src/live.ts`) and
fans the notification out to its open SSE streams, which re-render their
fragment and send it as a `datastar-patch-elements` event; Datastar morphs it
into the element with the same id. Pages open their stream with
`data-init="@get('…/stream')"`.

Actions don't answer with HTML: the status buttons `@post` and get a 204, and
the new state reaches every open page — the staff list, the order page, the
customer's phone — through its stream. So it also works across several app
servers, since they all listen to the same database.

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

For the staff demo, set `AUTH_SECRET` to a random secret of at least 32
characters before starting the server. For example, run
`export AUTH_SECRET="$(openssl rand -hex 32)"` in the same shell as the dev
command. Use the same secret on all server instances. Open
`http://localhost:3000/staff/login`. The dev seed assigns each account to one shop.

| Email | Password | Shop |
| --- | --- | --- |
| `maria@example.test` | `ecco-demo-maria` | Bottega della Maria |
| `pino@example.test` | `ecco-demo-pino` | Panificio del Pane |

Use these credentials with the dev seed only. Staff sessions use encrypted
JWTs in HTTP-only cookies and expire 30 minutes after sign-in. The cookie
requires HTTPS outside local development. Shop memberships are loaded at
sign-in and included in the token. Sign-out clears the cookie. Any existing
copy of the token remains valid until expiry, and staff live streams close
at expiry.

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
- [x] `GET /shop/:shopId/deliveries` - shop's order list, status filter,
      lookup by scanned barcode
- [x] `GET /shop/:shopId/deliveries/:id` - full address and status changes
      (created → paid → shipped → delivered, or cancelled)
- [x] Datastar on the frontend
- [x] Customer entry flow (phone → address → view)
- [x] Staff dashboard (live queue via SSE)
- [x] Staff sign-in and shop-level authorization
- [ ] Session/lead expiry cleanup job

## Notes

- No payment processing in the app — the customer pays once, at the
  shop's own till, for item + delivery together.
- No courier API integration in v1 — shop staff book couriers manually.
- Full delivery address should only ever be shown to staff at the point
  of booking a courier, not on any general-purpose dashboard view.

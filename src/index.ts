import { Hono } from 'hono'
import { html } from "hono/html";
import { sql } from "./db";

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get("/s/:shopId", async (c) => {
  const shopId = c.req.param("shopId");

  const shops = await sql`
    select id, name
    from shops
    where id = ${shopId}
      and status = 'active'
  `;
  
  const shop = shops[0];

  if (!shop) {
    return c.notFound();
  }

  return c.html(
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Serve It Home — {shop.name}</title>
      </head>
      <body>
        <main>
          <h1>Serve It Home</h1>

          <p>
            <strong>{shop.name}</strong>
          </p>

          <p>
            Enter your phone number to get started.
          </p>

          <form method="post" action="/customer/start">
            <label>
              Phone number
              <input
                type="tel"
                name="phone"
                autocomplete="tel"
                required
              />
            </label>

            <button type="submit">
              Continue
            </button>
          </form>
        </main>
      </body>
    </html>
  );
});

export default app

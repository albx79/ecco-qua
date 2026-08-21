import { Hono } from "hono";
import { html } from "hono/html";
import { sql } from "./db";

const app = new Hono();

app.get("/", (c) => {
    return c.text("Hello Hono!");
});

app.get("/s/:shopId", async (c) => {
    const shopId = c.req.param("shopId");

    type ShopRow = {
        id: string;
        name: string;
        address: string;
        status: string;
    };

    console.log(`Getting shop ${shopId}`);

    const [shop] = await sql<ShopRow[]>`
    select id, name, address, status
    from shops
    where id = ${shopId}
    `;

    if (!shop) {
        return c.notFound();
    }

    return c.html(
        <html lang="it">
            <head>
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css"
                />
                <meta charset="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <title>Ecco Qua - {shop.name}</title>
            </head>
            <body>
                <main>
                    <h1>Ecco Qua</h1>
                    <p>
                        <strong>{shop.name}</strong>
                        <br />
                        {shop.address}
                    </p>
                    <p>
                        Troppo grande per portarlo a casa?
                        <br />
                        Te lo spediamo noi!
                    </p>
                    <form method="post" action={`/s/${shop.id}/customer`}>
                        <label for="phone">Numero di telefono</label>

                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            inputmode="tel"
                            autocomplete="tel"
                            placeholder="+39 333 1234567"
                            required
                        />

                        <button type="submit">Avanti →</button>
                    </form>
                </main>
            </body>
        </html>,
    );
});

export default app;

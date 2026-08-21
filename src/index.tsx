import { Hono } from "hono";
import { findShopById } from "./shops";
import { getOrCreateLead } from "./leads";
import { Layout } from "./layout";

const app = new Hono();

app.get("/s/:shopId", async (c) => {
    const shopId = c.req.param("shopId");
    const shop = await findShopById(shopId);
    if (!shop) {
        return c.notFound();
    }

    return c.html(
        <Layout title={`Ecco Qua — ${shop.name}`}>
            <h2>{shop.name}</h2>

            <p>{shop.address}</p>

            <p>
                Troppo grande per portarlo a casa?
                <br />
                Te lo spediamo noi!
            </p>

            <form method="post" action={`/s/${shop.id}/customer`}>
                <label htmlFor="phone">Numero di telefono</label>

                <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                />

                <button type="submit">Avanti →</button>
            </form>
        </Layout>,
    );
});

app.post("/s/:shopId/customer", async (c) => {
    const shopId = c.req.param("shopId");

    const body = await c.req.parseBody();
    const phone = body["phone"];

    if (typeof phone !== "string" || phone.trim() === "") {
        return c.text("Numero di telefono obbligatorio", 400);
    }

    const normalizedPhone = phone.trim();

    // Verify that the shop exists.
    const shop = await findShopById(shopId);
    if (!shop) {
        return c.notFound();
    }

    const lead = await getOrCreateLead(phone, shopId);

    return c.html(
        <Layout title={`Ecco Qua — ${shop.name}`}>
            <p>Ciao! Il tuo numero è:</p>

            <p>
                <strong>{lead.phone}</strong>
            </p>

            <p>Lead ID: {lead.id}</p>
        </Layout>,
    );
});

export default app;

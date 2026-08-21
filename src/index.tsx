import { Hono } from "hono";
import { findShopById } from "./shops";
import { findLead, getOrCreateLead } from "./leads";
import { actionStyle, Layout } from "./layout";

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
                    autofocus
                />

                <div style={actionStyle}>
                    <button type="submit">Avanti →</button>
                </div>
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

    const lead = await getOrCreateLead(normalizedPhone, shopId);
    return c.redirect(`/customer/${lead.id}/address`);
});

app.get("/customer/:leadId/address", async (c) => {
    const leadId = c.req.param("leadId");
    const lead = await findLead(leadId);
    if (!lead) {
        return c.notFound();
    }

    return c.html(
        <Layout title={`Ecco Qua — ${lead.shopName}`}>
            <h2>Dove vuoi ricevere il tuo acquisto?</h2>
            <form method="post" action={`/customer/${leadId}/address`}>
                <label htmlFor="name">Nome</label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    inputMode="text"
                    autocomplete="name"
                    autocapitalize="words"
                    spellcheck={false}
                    required
                    autofocus
                />

                <label htmlFor="address">Indirizzo</label>
                <textarea
                    id="address"
                    name="address"
                    rows={3}
                    autocomplete="street-address"
                    autocapitalize="words"
                    spellcheck={false}
                ></textarea>

                <div style={actionStyle}>
                    <button type="submit">Avanti →</button>
                </div>
            </form>
            <hr/>
            <form method="post" action={`/customer/${leadId}/login`}>
                <div style={actionStyle}>
                    <p>Hai già un account?</p>
                    <button type="submit">Accedi 🔑︎</button>
                </div>
            </form>
        </Layout>,
    );
});

export default app;

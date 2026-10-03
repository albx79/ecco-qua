import { Hono } from "hono";
import { findShopById } from "./shops";
import { findLead, getOrCreateLead } from "./leads";
import { actionStyle, Barcode, Layout } from "./layout";
import {
    Address,
    addressFields,
    createDelivery,
    getDeliveriesOfShop,
    getDelivery,
} from "./deliveries";

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

            <p>
                {shop.addressLine1}, {shop.postalCode} {shop.city}
            </p>

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
                <label htmlFor="recipient_name">Nome</label>
                <input
                    id="recipient_name"
                    name="recipient_name"
                    type="text"
                    inputMode="text"
                    autocomplete="name"
                    autocapitalize="words"
                    spellcheck={false}
                    required
                    autofocus
                />

                <label htmlFor="address_line1">Indirizzo</label>
                <textarea
                    id="address_line1"
                    name="address_line1"
                    rows={3}
                    autocomplete="address-line1"
                    autocapitalize="words"
                    spellcheck={false}
                ></textarea>

                <label htmlFor="province">Provincia</label>
                <input type="text"
                    id="province"
                    name="province"
                    autocomplete="address-level1"
                    autocapitalize="words"
                    spellcheck={false}
                ></input>

                <label htmlFor="city">Città</label>
                <input type="text"
                    id="city"
                    name="city"
                    autocomplete="address-level2"
                    autocapitalize="words"
                    spellcheck={false}
                ></input>

                <label htmlFor="postal_code">CAP</label>
                <input type="text"
                    id="postal_code"
                    name="postal_code"
                    autocomplete="postal-code"
                    autocapitalize="words"
                    spellcheck={false}
                ></input>

                <div style={actionStyle}>
                    <button type="submit">Avanti →</button>
                </div>
            </form>
            <hr />
            <form method="post" action={`/customer/${leadId}/login`}>
                <div style={actionStyle}>
                    <p>Hai già un account?</p>
                    <button type="submit">Accedi 🔑︎</button>
                </div>
            </form>
        </Layout>,
    );
});

app.post("/customer/:leadId/address", async (c) => {
    const leadId = c.req.param("leadId");
    const lead = await findLead(leadId);
    if (!lead) {
        return c.notFound();
    }

    const body = await c.req.parseBody();
    const address = {} as Address;
    for (const field of addressFields) {
        const value = body[field];
        if (typeof value !== "string" || value.trim() === "") {
            return c.text(`${field} obbligatorio`, 400);
        }
        address[field] = value.trim();
    }

    const deliveryId = (await createDelivery(leadId, address)).deliveryId;

    return c.redirect(`/customer/deliveries/${deliveryId}`);
});

app.get("/customer/deliveries/:deliveryId", async (c) => {
    const deliveryId = c.req.param("deliveryId");
    console.log(`getting delivery ${deliveryId}`);
    const delivery = await getDelivery(deliveryId);
    if (!delivery) {
        return c.notFound();
    }

    return c.html(
        <Layout title="Delivery">
            <h2>La tua prossima consegna</h2>
            <p>
                {delivery.recipientName}
                <br />
                {delivery.addressLine1}
                <br />
                {delivery.postalCode} {delivery.city} {delivery.province}
            </p>
            <p>
                Status: <strong>{delivery.status}</strong>
            </p>
            <p>
                Mostra al cassiere questo codice a barre e noi gestiremo tutto
                automaticamente:
            </p>
            <p>
                <Barcode code={`${delivery.sku}?`} />
            </p>
            <p>
                Aumenta al massimo la luminosità dello schermo per facilitare la
                lettura del codice.
            </p>
        </Layout>,
    );
});

app.get("/shop/:shopId/deliveries", async (c) => {
    const shopId = c.req.param("shopId");
    const shop = await findShopById(shopId);
    if (!shop) {
        return c.notFound();
    }
    const deliveries = await getDeliveriesOfShop(shopId);
    console.log(`listing ${deliveries.length} deliveries`)
    return c.html(
        <Layout title="Deliveries">
            <h2>
                Consegne da <em>{shop.name}</em>
            </h2>
            <table>
                <thead>
                    <td>Nome</td>
                    <td>Città</td>
                    <td>Fase</td>
                </thead>
                <tbody>
                    {deliveries.map((d) => (
                        <tr id={d.id}>
                            <td>{d.recipientName}</td>
                            <td>{d.city}</td>
                            <td>{d.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Layout>,
    );
});

export default app;

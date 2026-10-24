import { Hono } from "hono";
import { findShopById } from "./shops";
import { findLead, getOrCreateLead } from "./leads";
import { actionStyle, Barcode, Layout } from "./layout";
import {
    Address,
    addressFields,
    createDelivery,
    deliveryStatuses,
    DeliveryStatus,
    findDeliveryBySku,
    getDeliveriesOfShop,
    getDelivery,
    getShopDelivery,
    isDeliveryStatus,
    openStatuses,
    setDeliveryStatus,
    skuDigits,
    statusTransitions,
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
                <Barcode code={`${skuDigits(delivery.sku)}?`} />
            </p>
            <p>
                Aumenta al massimo la luminosità dello schermo per facilitare la
                lettura del codice.
            </p>
        </Layout>,
    );
});

const statusLabels: Record<DeliveryStatus, string> = {
    created: "Creato",
    paid: "Pagato",
    shipped: "Spedito",
    delivered: "Consegnato",
    cancelled: "Annullato",
};

const transitionLabels: Record<DeliveryStatus, string> = {
    created: "",
    paid: "Segna come pagato",
    shipped: "Segna come spedito",
    delivered: "Segna come consegnato",
    cancelled: "Annulla",
};

const formatDate = (d: Date) =>
    d.toLocaleString("it-IT", {
        timeZone: "Europe/Rome",
        dateStyle: "short",
        timeStyle: "short",
    });

// What the scanner reads is the 13-digit EAN: the SKU plus a check digit.
// Shorter input is a SKU typed by hand.
function parseScannedSku(input: string): string | undefined {
    const digits = input.replace(/\s/g, "");
    if (!/^\d{1,13}$/.test(digits)) {
        return undefined;
    }
    return digits.length === 13 ? digits.slice(0, 12) : digits;
}

app.get("/shop/:shopId/deliveries", async (c) => {
    const shopId = c.req.param("shopId");
    const shop = await findShopById(shopId);
    if (!shop) {
        return c.notFound();
    }

    const skuInput = c.req.query("sku");
    let skuNotFound = false;
    if (skuInput !== undefined && skuInput.trim() !== "") {
        const sku = parseScannedSku(skuInput);
        const found = sku && (await findDeliveryBySku(shopId, sku));
        if (found) {
            return c.redirect(`/shop/${shopId}/deliveries/${found.deliveryId}`);
        }
        skuNotFound = true;
    }

    const filter = c.req.query("status") ?? "open";
    const statuses =
        filter === "all" ? deliveryStatuses
        : isDeliveryStatus(filter) ? [filter]
        : openStatuses;
    const deliveries = await getDeliveriesOfShop(shopId, statuses);

    const filters: [string, string][] = [
        ["open", "Aperti"],
        ...deliveryStatuses.map((s): [string, string] => [s, statusLabels[s]]),
        ["all", "Tutti"],
    ];

    return c.html(
        <Layout title={`Ordini — ${shop.name}`}>
            <h2>
                Ordini di <em>{shop.name}</em>
            </h2>

            <form method="get" action={`/shop/${shopId}/deliveries`}>
                <label htmlFor="sku">Scansiona o digita il codice a barre</label>
                <input
                    id="sku"
                    name="sku"
                    type="text"
                    inputMode="numeric"
                    autocomplete="off"
                    autofocus
                />
                {skuNotFound && (
                    <p>
                        <strong>Nessun ordine con il codice {skuInput}</strong>
                    </p>
                )}
                <div style={actionStyle}>
                    <button type="submit">Cerca</button>
                </div>
            </form>

            <p>
                {filters.map(([value, label], i) => (
                    <>
                        {i > 0 && " · "}
                        {value === filter ? (
                            <strong>{label}</strong>
                        ) : (
                            <a href={`/shop/${shopId}/deliveries?status=${value}`}>{label}</a>
                        )}
                    </>
                ))}
            </p>

            {deliveries.length === 0 ? (
                <p>Nessun ordine.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Nome</th>
                            <th>Città</th>
                            <th>Codice</th>
                            <th>Stato</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deliveries.map((d) => (
                            <tr id={d.id}>
                                <td>{formatDate(d.createdAt)}</td>
                                <td>
                                    <a href={`/shop/${shopId}/deliveries/${d.id}`}>
                                        {d.recipientName}
                                    </a>
                                </td>
                                <td>{d.city}</td>
                                <td>{d.sku && skuDigits(d.sku)}</td>
                                <td>{isDeliveryStatus(d.status) ? statusLabels[d.status] : d.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Layout>,
    );
});

app.get("/shop/:shopId/deliveries/:deliveryId", async (c) => {
    const shopId = c.req.param("shopId");
    const shop = await findShopById(shopId);
    if (!shop) {
        return c.notFound();
    }
    const d = await getShopDelivery(shopId, c.req.param("deliveryId"));
    if (!d || !isDeliveryStatus(d.status)) {
        return c.notFound();
    }

    return c.html(
        <Layout title={`Ordine — ${d.recipientName}`}>
            <p>
                <a href={`/shop/${shopId}/deliveries`}>← Tutti gli ordini</a>
            </p>
            <h2>Ordine di {d.recipientName}</h2>
            <p>
                Creato il {formatDate(d.createdAt)}
                <br />
                Codice: <strong>{d.sku ? skuDigits(d.sku) : "—"}</strong>
                <br />
                Stato: <strong>{statusLabels[d.status]}</strong>
            </p>

            <h3>Indirizzo di consegna</h3>
            <p>
                {d.recipientName}
                <br />
                {d.addressLine1}
                {d.addressLine2 && (
                    <>
                        <br />
                        {d.addressLine2}
                    </>
                )}
                <br />
                {d.postalCode} {d.city} {d.province} {d.countryCode}
                <br />
                Tel. <a href={`tel:${d.phone}`}>{d.phone}</a>
            </p>

            {statusTransitions[d.status].length > 0 && (
                <form method="post" action={`/shop/${shopId}/deliveries/${d.id}/status`}>
                    <div style={actionStyle}>
                        {statusTransitions[d.status].map((to) => (
                            <button type="submit" name="to" value={to}>
                                {transitionLabels[to]}
                            </button>
                        ))}
                    </div>
                </form>
            )}
        </Layout>,
    );
});

app.post("/shop/:shopId/deliveries/:deliveryId/status", async (c) => {
    const shopId = c.req.param("shopId");
    const deliveryId = c.req.param("deliveryId");
    const shop = await findShopById(shopId);
    if (!shop) {
        return c.notFound();
    }

    const body = await c.req.parseBody();
    const to = body["to"];
    if (!isDeliveryStatus(to)) {
        return c.text("Stato non valido", 400);
    }

    const updated = await setDeliveryStatus(shopId, deliveryId, to);
    if (!updated) {
        return c.text("L'ordine non può passare a questo stato", 409);
    }

    return c.redirect(`/shop/${shopId}/deliveries/${deliveryId}`);
});

export default app;

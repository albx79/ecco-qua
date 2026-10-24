import { sql } from "./db";

export type Address = {
    recipient_name: string;
    address_line1: string;
    postal_code: string;
    city: string;
    province: string;
};
export const addressFields = [
    "recipient_name",
    "address_line1",
    "postal_code",
    "city",
    "province",
] as const satisfies readonly (keyof Address)[];

export async function createDelivery(
    leadId: string,
    address: Address,
): Promise<{ deliveryId: string; sku: string }> {
    return sql.begin(async (sql) => {
        const [{ id: deliveryId }] = await sql<{ id: string }[]>`
          insert into deliveries (lead_id, recipient_name, address_line1, postal_code, city, province)
          values (
            ${leadId}::uuid, ${address.recipient_name}, ${address.address_line1},
            ${address.postal_code}, ${address.city}, ${address.province}
          )
          returning id
        `;

        const [{ sku }] = await sql<{ sku: string }[]>`
          INSERT INTO open_barcodes(delivery_id, shop_id, sku )
          SELECT
              d.id as delivery_id, s.id as shop_id,
              random(
                lower(s.sku_range) + (NOT lower_inc(s.sku_range))::int,
                upper(s.sku_range) - (NOT upper_inc(s.sku_range))::int
              ) AS sku
          FROM deliveries d
          JOIN leads l on d.lead_id = l.id
          JOIN shops s on l.shop_id = s.id
          WHERE d.id = ${deliveryId}::uuid
              AND (
                lower(s.sku_range) + (NOT lower_inc(s.sku_range))::int
                <=
                upper(s.sku_range) - (NOT upper_inc(s.sku_range))::int
              )
          LIMIT 1
          RETURNING sku;
        `;

        return { deliveryId, sku };
    });
}

export async function getDelivery(deliveryId: string) {
    const [delivery] = await sql<{ id: string; status: string; sku: string; recipientName: string; 'addressLine1': string; postalCode: string; city: string; province: string | null }[]>`
      select
        d.id, d.status, ob.sku,
        d.recipient_name as "recipientName",
        d.address_line1 as "addressLine1",
        d.postal_code as "postalCode",
        d.city,
        d.province
      from deliveries d
      join open_barcodes ob on ob.delivery_id = d.id
      where d.id = ${deliveryId}::uuid
    `;
    return delivery;
}

// SKUs are stored as int8, so leading zeros are lost; EAN-13 needs all 12
// digits before the check digit.
export function skuDigits(sku: string): string {
    return sku.padStart(12, "0");
}

export const deliveryStatuses = [
    "created",
    "paid",
    "shipped",
    "delivered",
    "cancelled",
] as const;
export type DeliveryStatus = (typeof deliveryStatuses)[number];

export const openStatuses: readonly DeliveryStatus[] = ["created", "paid", "shipped"];

// Which statuses each status may move to; anything else is rejected.
export const statusTransitions: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
    created: ["paid", "cancelled"],
    paid: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
};

export function isDeliveryStatus(s: unknown): s is DeliveryStatus {
    return deliveryStatuses.includes(s as DeliveryStatus);
}

// No address beyond the city here: the full address is only shown on the
// delivery's own page, when booking the courier.
export async function getDeliveriesOfShop(shopId: string, statuses: readonly DeliveryStatus[]) {
    return sql<{ id: string; createdAt: Date; status: string; recipientName: string; city: string; sku: string | null }[]>`
      select d.id, d.created_at as "createdAt", d.status,
             d.recipient_name as "recipientName", d.city, ob.sku
      from deliveries d
      join leads l on l.id = d.lead_id
      left join open_barcodes ob on ob.delivery_id = d.id
      where l.shop_id = ${shopId}::uuid
        and d.status = any(${statuses as string[]}::text[])
      order by d.created_at desc
    `;
}

export async function getShopDelivery(shopId: string, deliveryId: string) {
    const [delivery] = await sql<{ id: string; createdAt: Date; status: string; sku: string | null; recipientName: string; addressLine1: string; addressLine2: string | null; postalCode: string; city: string; province: string | null; countryCode: string; phone: string }[]>`
      select
        d.id, d.created_at as "createdAt", d.status, ob.sku,
        d.recipient_name as "recipientName",
        d.address_line1 as "addressLine1",
        d.address_line2 as "addressLine2",
        d.postal_code as "postalCode",
        d.city,
        d.province,
        d.country_code as "countryCode",
        coalesce(d.phone, l.phone) as "phone"
      from deliveries d
      join leads l on l.id = d.lead_id
      left join open_barcodes ob on ob.delivery_id = d.id
      where d.id = ${deliveryId}::uuid
        and l.shop_id = ${shopId}::uuid
    `;
    return delivery;
}

export async function findDeliveryBySku(shopId: string, sku: string) {
    const [delivery] = await sql<{ deliveryId: string }[]>`
      select delivery_id as "deliveryId"
      from open_barcodes
      where shop_id = ${shopId}::uuid
        and sku = ${sku}::int8
    `;
    return delivery;
}

// Returns undefined if the delivery isn't this shop's, or if it isn't in a
// status that may move to `to` (e.g. two staff clicking at once).
export async function setDeliveryStatus(shopId: string, deliveryId: string, to: DeliveryStatus) {
    const from = deliveryStatuses.filter((s) => statusTransitions[s].includes(to));
    const [updated] = await sql<{ id: string }[]>`
      update deliveries d
      set status = ${to}
      from leads l
      where l.id = d.lead_id
        and l.shop_id = ${shopId}::uuid
        and d.id = ${deliveryId}::uuid
        and d.status = any(${from}::text[])
      returning d.id
    `;
    return updated;
}

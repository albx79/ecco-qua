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

export async function getDeliveriesOfShop(shopId: string) {
    return sql<{ id: string; status: string; recipientName: string; city: string }[]>`
      select d.id, d.status, d.recipient_name as "recipientName", d.city
      from deliveries d
      join leads l on l.id = d.lead_id
      where l.shop_id = ${shopId}::uuid
      order by d.created_at desc
    `;
}

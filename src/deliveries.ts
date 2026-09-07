import { sql } from "./db";

export type CreatedDelivery = {
    deliveryId: string;
    sku: bigint;
};
export const addressFields = [
    "recipient_name",
    "address_line1",
    "postal_code",
    "city",
    "province",
];
export async function createDelivery(
    leadId: string,
    address: { [field: string]: string },
): Promise<CreatedDelivery> {
    const addressValues = addressFields.map(f => "'" + address[f] + "'"); 
    const deliveries = await sql<{ id: string }[]>`
      insert into deliveries (lead_id, ${addressFields.join(", ")}) 
      values (${leadId}, ${addressValues.join(", ")})
      returning id
    `;
    const deliveryId = deliveries[0].id;

    const [{ sku }] = await sql<{ sku: bigint }>`
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
      WHERE d.id = ${deliveryId}
          AND (
            lower(s.sku_range) + (NOT lower_inc(s.sku_range))::int
            <=
            upper(s.sku_range) - (NOT upper_inc(s.sku_range))::int
          )
      LIMIT 1
      RETURNING sku;
    `;

    return { deliveryId, sku };
}

export type Delivery = {
    id: string;
    deliveryAddress: string;
    status: string;
    sku: bigint;
};

export async function getDelivery(deliveryId: string): Promise<Delivery> {
    const deliveries = await sql<Delivery[]>`
      select d.id as id, delivery_address as "deliveryAddress", status as "status", ob.sku as sku
      from deliveries d
      join open_barcodes ob on ob.delivery_id = d.id
      where id = ${deliveryId}
    `;
    console.log(deliveries);
    return deliveries[0]!;
}

export async function getDeliveriesOfShop(shopId: string): Promise<Delivery[]> {
    const deliveries = await sql<Delivery[]>`
    select d.id as id, delivery_address as "deliveryAddress", d.status as "status", ob.sku as sku
    from deliveries d
    join open_barcodes ob on ob.delivery_id = d.id
    join leads l on l.id = d.lead_id
    join shops s on s.id = l.shop_id
    where s.id = ${shopId}
  `;
    console.log(deliveries);
    return deliveries!;
}

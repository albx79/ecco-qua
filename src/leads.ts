import { sql } from "./db";

export async function getOrCreateLead(phone: string, shopId: string) {
    const [lead] = await sql<{ id: string; phone: string; shopId: string; customerId: string | null }[]>`
      insert into leads (phone, shop_id)
      values (${phone}, ${shopId}::uuid)
      on conflict (phone, shop_id)
      do update set phone = excluded.phone, shop_id = excluded.shop_id
      returning
        id,
        phone,
        shop_id as "shopId",
        customer_id as "customerId"
    `;
    return lead;
}

export async function findLead(id: string) {
    const [lead] = await sql<{ leadId: string; phone: string; customerId: string | null; shopId: string; shopName: string; skuRange: string }[]>`
      select l.id as "leadId", l.phone, l.customer_id as "customerId", l.shop_id as "shopId",
             s.name as "shopName", s.sku_range as "skuRange"
      from leads l
      join shops s on l.shop_id = s.id
      where l.id = ${id}::uuid
    `;
    return lead;
}

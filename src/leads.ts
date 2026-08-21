import { sql } from "./db";

export type Lead = {
    id: string;
    phone: string;
    shopId: string;
    customerId: string | null;
};

export async function getOrCreateLead(
    phone: string,
    shopId: string,
): Promise<Lead> {
  const leads = await sql<Lead[]>`
    insert into leads (phone, shop_id)
    values (${phone}, ${shopId})
    on conflict (phone, shop_id)
    do update set phone = excluded.phone, shop_id = excluded.shop_id
    returning
      id,
      phone,
      shop_id as "shopId",
      customer_id as "customerId"
  `;

  return leads[0]!;
}

export type LeadAndShop = {
    leadId: string,
    shopId: string,
    shopName: string,
    phone: string,
    customerId: string | null
}

export async function findLead(id: string): Promise<LeadAndShop | undefined> {
    const leads = await sql<LeadAndShop[]>`
      select l.id as "leadId", l.phone, customer_id as "customerId", shop_id as "shopId", s.name as "shopName"
      from leads l
      join shops s on l.shop_id = s.id
      where l.id = ${id}`;
    return leads[0]!;
}
import { sql } from "./db";

export type Lead = {
  id: string;
  phone: string;
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
      customer_id as "customerId"
  `;

  return leads[0]!;
}
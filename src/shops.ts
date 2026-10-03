import { sql } from "./db";

export async function findShopById(id: string) {
    const [shop] = await sql<{ id: string; name: string; 'addressLine1': string; postalCode: string; city: string; status: string }[]>`
      select id, name, address_line1 as "addressLine1", postal_code as "postalCode", city, status
      from shops
      where id = ${id}::uuid
      and status = 'active'
    `;
    return shop;
}

import { sql } from "./db";

export type Shop = {
    id: string;
    name: string;
    address: string;
    status: string;
};

export async function findShopById(id: string): Promise<Shop | undefined> {
    console.log(`Getting shop ${id}`);

    const shops = await sql<Shop[]>`
    select id, name, address, status
    from shops
    where id = ${id}
    and status = 'active'
  `;

    console.log(`Got ${shops}`);

    return shops[0];
}

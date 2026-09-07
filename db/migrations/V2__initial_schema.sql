create table shops (
    like base_template including all,
    like address_template including defaults including constraints,
    name text not null,
    vat_number text not null,
    status text not null default 'onboarding',
    sku_range int8range not null,
    check(not isempty(sku_range)),
    check(NOT lower_inf(sku_range)),
    check(NOT upper_inf(sku_range))
);

create unique index shop_vat_number_unique on shops(vat_number);

create table customers (
    like base_template including all,
    name text not null
);

create table customer_addresses (
    like base_template including all,
    like address_template including defaults including constraints,
    customer_id uuid not null references customers(id),
    is_default boolean not null default false
);

create index customer_addresses_customer_id_idx on customer_addresses(customer_id);

create unique index customer_addresses_one_default_per_customer
  on customer_addresses (customer_id)
  where is_default;

create table leads (
    like base_template including all,
    phone text not null,
    shop_id uuid not null references shops(id),
    customer_id uuid references customers(id),
    constraint one_phone_per_shop unique (phone, shop_id)
);

create index leads_shop_id_idx on leads(shop_id);
create index leads_customer_id_idx on leads(customer_id);

create table deliveries (
    like base_template including all,
    like address_template including defaults including constraints,
    lead_id uuid unique not null references leads(id),
    status text not null default 'created',
    shop_data jsonb -- shop-dependent order details (e.g. S/M/L, weight class, etc), to be detailed later
);

create table open_barcodes (
    shop_id uuid not null references shops(id),
    sku int8 not null,
    delivery_id uuid not null references deliveries(id),
    created_at timestamptz not null default now(),

    primary key (shop_id, sku),
    unique (delivery_id)
);

create view delivery_details as
select
  d.id             as delivery_id,
  d.created_at     as delivery_created_at,
  d.status         as delivery_status,
  d.recipient_name,
  d.address_line1,
  d.address_line2,
  d.postal_code,
  d.city,
  d.province,
  d.country_code,
  d.phone          as recipient_phone,
  d.shop_data,
  s.id             as shop_id,
  s.name           as shop_name,
  s.vat_number     as shop_vat_number,
  s.status         as shop_status,
  l.id             as lead_id,
  l.phone          as lead_phone,
  l.created_at     as lead_created_at,
  l.customer_id    as customer_id,
  c.name           as customer_name
from deliveries d
join leads l   on l.id = d.lead_id
join shops s   on s.id = l.shop_id
left join customers c on c.id = l.customer_id;

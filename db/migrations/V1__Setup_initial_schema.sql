create table shops (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    vat_number text not null,
    name text not null,
    address text not null,
    status text not null default 'onboarding',
    phone text,
    sku_range int8range not null,
    check(not isempty(sku_range)),
    check(NOT lower_inf(sku_range)),
    check(NOT upper_inf(sku_range))
);

create unique index shop_vat_number_unique on shops(vat_number);

create table customers (
    id uuid primary key default gen_random_uuid(),
    name text not null
);

create table addresses (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references customers(id),
    address text not null
);

create table leads (
    id uuid primary key default gen_random_uuid(),
    phone text not null,
    shop_id uuid not null references shops(id),
    customer_id uuid references customers(id),
    created_at timestamptz not null default now()
);

alter table leads add constraint one_phone_per_shop unique (phone, shop_id);

create table deliveries (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),

    lead_id uuid unique not null references leads(id),
    delivery_address text not null,
    
    shop_data jsonb, -- shop-dependent order details (e.g. S/M/L, weight class, etc), to be detailed later

    status text not null default 'created'
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
  d.delivery_address,
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

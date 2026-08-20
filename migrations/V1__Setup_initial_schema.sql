create table shops (
    id uuid primary key default gen_random_uuid(),
    vat_number text not null,
    name text not null,
    address text not null,
    status text not null default 'onboarding',
    phone text
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
    customer_id uuid references customers(id),
    created_at timestamptz not null default now()
);

create table delivery (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),

    lead_id uuid not null references leads(id),
    shop_id uuid not null references shops(id),
    customer_id uuid references customers(id),
    delivery_address text not null,
    
    shop_data jsonb, -- shop-dependent order details (e.g. S/M/L, weight class, etc)

    status text not null default 'created'
);
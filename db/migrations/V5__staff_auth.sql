create table staff_users (
    like base_template including all,
    email text not null unique check (email = lower(email)),
    password_hash text not null
);

create table shop_staff (
    staff_id uuid not null references staff_users(id) on delete cascade,
    shop_id uuid not null references shops(id) on delete cascade,
    primary key (staff_id, shop_id)
);

create table staff_sessions (
    token_hash text primary key,
    staff_id uuid not null references staff_users(id) on delete cascade,
    expires_at timestamptz not null
);

create table base_template (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now()
);

create table address_template (
    recipient_name text not null,
    address_line1 text not null,
    address_line2 text,
    postal_code text not null,
    city text not null,
    province text,
    country_code char(2) not null default 'IT' check (country_code = upper(country_code)), -- ISO-3166-1 alpha-2
    phone text
);

create or replace function forbid_template_dml()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Table % is a DDL template and cannot store data', tg_table_name;
end;
$$;

create trigger no_dml_on_base_template
before insert or update or delete on base_template
for each row execute function forbid_template_dml();

create trigger no_dml_on_address_template
before insert or update or delete on address_template
for each row execute function forbid_template_dml();

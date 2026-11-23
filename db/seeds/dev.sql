insert into shops (vat_number, name, recipient_name, address_line1, city, postal_code, status, sku_range) values 
('12345678901', 'Bottega della Maria', 'Maria Bottegari', 'Via Roma 1', 'Milano', '20100', 'active', '[041234567000, 041234567999]'), 
('12345678902', 'Panificio del Pane', 'Pino Paniere', 'Via Roma 2', 'Milano', '20100', 'active', '[041234560000, 041234569999]') 
returning id;

with demo_staff as (
    insert into staff_users (email, password_hash) values
    ('maria@example.test', '$argon2id$v=19$m=65536,t=2,p=1$erPTdSa6TK9YY6Qt2J0JLFSqSFF12CVNvC79ylPw9t0$ETAGFnudLenE0TlE+OYumRt5JAfnZ3YzY73YGB3tDPI'),
    ('pino@example.test', '$argon2id$v=19$m=65536,t=2,p=1$arqoq1l7EAgs+y07jTkhEBy3+ucRehZnUNY+SH+f1PI$oHNIA+2T8AcjmglguuxS+57lApunTc2utruBXN9eUg0')
    returning id, email
)
insert into shop_staff (staff_id, shop_id)
select demo_staff.id, shops.id
from demo_staff
join shops on shops.vat_number = case demo_staff.email
    when 'maria@example.test' then '12345678901'
    when 'pino@example.test' then '12345678902'
end;

insert into shops (vat_number, name, recipient_name, address_line1, city, postal_code, status, sku_range) values 
('12345678901', 'Bottega della Maria', 'Maria Bottegari', 'Via Roma 1', 'Milano', '20100', 'active', '[041234567000, 041234567999]'), 
('12345678902', 'Panificio del Pane', 'Pino Paniere', 'Via Roma 2', 'Milano', '20100', 'active', '[041234560000, 041234569999]') 
returning id;

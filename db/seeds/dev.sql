insert into shops (vat_number, name, address, status, sku_range) values 
('12345678901', 'Bottega della Maria', 'Via Roma 1\n20100 Milano', 'active', '[041234567000, 041234567999]'), 
('12345678902', 'Panificio del Pane', 'Via Roma 2\n20100 Milano', 'active', '[041234560000, 041234569999]') 
returning id;

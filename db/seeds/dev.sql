insert into shops (vat_number, name, address, status) values 
('12345678901', 'Bottega della Maria', 'Via Roma 1\n20100 Milano', 'active'), 
('12345678902', 'Panificio del Pane', 'Via Roma 2\n20100 Milano', 'active') 
returning id;

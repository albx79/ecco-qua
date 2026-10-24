alter table deliveries
  add constraint deliveries_status_check
  check (status in ('created', 'paid', 'shipped', 'delivered', 'cancelled'));

create index deliveries_status_idx on deliveries(status);

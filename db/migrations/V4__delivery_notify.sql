-- Tell listening app servers about every delivery change. pg_notify is
-- transactional: the notification goes out on commit, so listeners see the
-- delivery together with anything inserted alongside it (e.g. its barcode).
create function notify_delivery_changed()
returns trigger
language plpgsql
as $$
begin
  perform pg_notify(
    'delivery_changed',
    json_build_object(
      'deliveryId', new.id,
      'shopId', (select shop_id from leads where id = new.lead_id)
    )::text
  );
  return null;
end;
$$;

create trigger delivery_changed
after insert or update on deliveries
for each row execute function notify_delivery_changed();

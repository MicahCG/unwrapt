create index fulfillment_orders_recipient_idx
  on public.fulfillment_orders(recipient_id);
create index fulfillment_options_product_idx
  on public.fulfillment_options(product_id) where product_id is not null;
create index fulfillment_events_user_idx
  on public.fulfillment_events(user_id) where user_id is not null;

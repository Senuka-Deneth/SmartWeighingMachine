alter table push_subscriptions
  add constraint unique_endpoint unique (endpoint);

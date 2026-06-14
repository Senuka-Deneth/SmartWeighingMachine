-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Table: machines
create table machines (
  id              uuid primary key default gen_random_uuid(),
  machine_number  int unique not null,
  status          text default 'online' check (status in ('online', 'offline')),
  created_at      timestamptz default now()
);

-- Table: compartments
create table compartments (
  id                   uuid primary key default gen_random_uuid(),
  machine_id           uuid references machines(id) on delete cascade,
  slot_number          int not null,
  product_name         text,
  status               text default 'inactive' check (status in ('active', 'inactive')),
  total_capacity       numeric default 25,
  current_stock        numeric default 25,
  low_stock_threshold  numeric default 5,
  api_key              text unique,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  unique(machine_id, slot_number)
);

-- Table: dispense_logs
create table dispense_logs (
  id              uuid primary key default gen_random_uuid(),
  compartment_id  uuid references compartments(id) on delete cascade,
  amount          numeric not null,
  stock_before    numeric not null,
  stock_after     numeric not null,
  created_at      timestamptz default now()
);

-- Table: refill_logs
create table refill_logs (
  id              uuid primary key default gen_random_uuid(),
  compartment_id  uuid references compartments(id) on delete cascade,
  refilled_by     uuid references auth.users(id),
  stock_before    numeric not null,
  created_at      timestamptz default now()
);

-- Table: push_subscriptions
create table push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  endpoint        text not null,
  p256dh          text not null,
  auth            text not null,
  created_at      timestamptz default now()
);

-- Enable Row Level Security
alter table machines enable row level security;
alter table compartments enable row level security;
alter table dispense_logs enable row level security;
alter table refill_logs enable row level security;
alter table push_subscriptions enable row level security;

-- RLS Policies: Authenticated users can read all data
create policy "Authenticated users can view machines" on machines
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can view compartments" on compartments
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can update compartments" on compartments
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users can view dispense logs" on dispense_logs
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert dispense logs" on dispense_logs
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can view refill logs" on refill_logs
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert refill logs" on refill_logs
  for insert with check (auth.role() = 'authenticated');

create policy "Users can manage their own push subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id);

-- Enable Realtime on compartments table (for live dashboard updates)
alter publication supabase_realtime add table compartments;

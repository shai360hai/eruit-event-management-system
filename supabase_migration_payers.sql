-- Run this in Supabase SQL Editor

-- 1. Table of payers (clients who pay for events)
create table if not exists payers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- 2. Insert default payers
insert into payers (name) values
  ('אורן פריבאי'),
  ('יהודה שולמן')
on conflict (name) do nothing;

-- 3. Table of payments received FROM payers (reduces their running debt)
create table if not exists payments_received (
  id uuid primary key default gen_random_uuid(),
  payer_name text not null,
  amount numeric not null,
  note text default '',
  received_at date not null default current_date,
  created_at timestamptz default now()
);

-- 4. Enable RLS (same policy as your other tables)
alter table payers enable row level security;
alter table payments_received enable row level security;

create policy "authenticated read payers"
  on payers for select to authenticated using (true);

create policy "authenticated manage payers"
  on payers for all to authenticated using (true);

create policy "authenticated read payments_received"
  on payments_received for select to authenticated using (true);

create policy "authenticated manage payments_received"
  on payments_received for all to authenticated using (true);

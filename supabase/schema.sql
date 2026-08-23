-- Run this in the Supabase SQL Editor before deploying.
create table if not exists profiles (id uuid primary key references auth.users(id) on delete cascade, setup_complete boolean not null default false, created_at timestamptz default now());
create table if not exists holdings (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, symbol text not null, type text not null check(type in ('stock','fund')), units numeric not null, avg_cost numeric not null, current_price numeric not null, buy_date date, updated_at timestamptz default now());
-- Safe upgrades for projects created with the earlier schema.
alter table holdings add column if not exists buy_date date;
create table if not exists portfolio_history (id bigint generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade, value numeric not null, invested numeric not null default 0, recorded_at timestamptz default now());
alter table portfolio_history add column if not exists invested numeric not null default 0;
-- Keep transactions as the audit trail for future buys, sells, dividends and SIP instalments.
create table if not exists transactions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, holding_id uuid references holdings(id) on delete cascade, transaction_type text not null check(transaction_type in ('buy','sell','dividend','sip')), transacted_on date not null, units numeric not null default 0, price numeric not null default 0, charges numeric not null default 0, note text, created_at timestamptz default now());
alter table profiles enable row level security; alter table holdings enable row level security; alter table portfolio_history enable row level security; alter table transactions enable row level security;
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own holdings" on holdings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own history" on portfolio_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transactions" on transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles(id) values (new.id); return new; end; $$;
create or replace trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

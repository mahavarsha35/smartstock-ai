-- ============================================================================
-- SmartStock AI — Supabase PostgreSQL Production Schema
-- ============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project and navigate to the "SQL Editor" in the left sidebar.
-- 3. Click "New Query", paste the entire contents of this file, and click "Run".
-- 4. Copy your Project URL & service_role (or anon) key from:
--    Project Settings > API
-- 5. Add them to your .env file or configure them in the SmartStock AI Settings tab!
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Suppliers / Vendor Ledger
create table if not exists public.suppliers (
  id text primary key,
  code text not null unique,
  name text not null,
  city_hub text not null,
  contact_person text not null,
  phone text not null,
  email text not null,
  gstin text not null,
  address text not null,
  categories jsonb not null default '[]'::jsonb,
  key_lines jsonb not null default '[]'::jsonb,
  completed_orders integer not null default 0,
  lead_time_hours integer not null default 24,
  payment_terms text not null default 'Net 15 Days',
  pending_amount numeric(12,2) not null default 0,
  rating numeric(3,1) not null default 4.8,
  status text not null default 'Active',
  tier text not null default 'Tier-1',
  inward_bay text not null default 'Bay 01 (Dry Grocery)',
  fulfillment_rate numeric(5,2) not null default 99.0,
  gstr_matched boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Products & Inventory Matrix
create table if not exists public.products (
  id text primary key,
  sku text not null unique,
  barcode text not null,
  name text not null,
  category text not null,
  stock_units integer not null default 0,
  min_stock integer not null default 15,
  unit_label text not null default 'units',
  cost_price numeric(10,2) not null,
  selling_price numeric(10,2) not null,
  supplier_id text references public.suppliers(id) on delete set null,
  supplier_name text not null,
  bay_location text not null default 'Bay A-01',
  daily_velocity numeric(8,2) not null default 1.0,
  lead_time_hours integer not null default 24,
  expiry_date text,
  batch_no text,
  image_url text not null,
  monthly_families integer default 0,
  weekly_revenue numeric(12,2) default 0,
  weekly_growth_pct numeric(5,1) default 0,
  aisle_note text,
  updated_at timestamptz not null default now()
);

-- 3. Stock Movement Audit Ledger
create table if not exists public.stock_movements (
  id text primary key,
  txn_code text not null unique,
  created_at timestamptz not null default now(),
  display_time text not null,
  display_date text not null,
  product_id text references public.products(id) on delete cascade,
  product_name text not null,
  sku text not null,
  image_url text,
  type text not null,
  qty_changed integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  reason_title text not null,
  reference_note text not null,
  handled_by text not null,
  handled_role text not null,
  unit_cost numeric(10,2)
);

-- 4. Purchase Orders
create table if not exists public.purchase_orders (
  id text primary key,
  po_number text not null unique,
  supplier_id text references public.suppliers(id) on delete set null,
  supplier_name text not null,
  gstin text not null,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  sku text not null,
  qty integer not null,
  unit_label text not null default 'units',
  unit_price numeric(10,2) not null,
  gst_rate numeric(5,2) not null default 5,
  total_amount numeric(12,2) not null,
  status text not null default 'Draft',
  expected_at text not null,
  created_at timestamptz not null default now(),
  notes text
);

-- 5. Notifications & Reorder Watchlist Alerts
create table if not exists public.notifications (
  id text primary key,
  title text not null,
  message text not null,
  severity text not null default 'warning',
  category text not null default 'Low Stock',
  created_at text not null,
  read boolean not null default false,
  product_id text,
  action_label text
);

-- 6. Staff Management
create table if not exists public.staff_members (
  id text primary key,
  name text not null,
  role text not null,
  branch text not null,
  phone text not null,
  email text not null,
  shift text not null,
  status text not null default 'On Shift',
  permissions jsonb not null default '[]'::jsonb,
  avatar_url text
);

-- 7. Store Configuration Settings (Singleton row id = 'default')
create table if not exists public.store_settings (
  id text primary key default 'default',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Performance Indexes
create index if not exists idx_products_sku on public.products (sku);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_supplier_id on public.products (supplier_id);
create index if not exists idx_movements_created_at on public.stock_movements (created_at desc);
create index if not exists idx_purchase_orders_status on public.purchase_orders (status);
create index if not exists idx_notifications_read on public.notifications (read);

-- ============================================================================
-- Row Level Security (RLS) Setup
-- ============================================================================
alter table if exists public.suppliers enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.stock_movements enable row level security;
alter table if exists public.purchase_orders enable row level security;
alter table if exists public.notifications enable row level security;
alter table if exists public.staff_members enable row level security;
alter table if exists public.store_settings enable row level security;

-- Idempotent RLS Policies: Allow backend service role & anon operations
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'suppliers' and policyname = 'Allow all operations on suppliers') then
    create policy "Allow all operations on suppliers" on public.suppliers for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'products' and policyname = 'Allow all operations on products') then
    create policy "Allow all operations on products" on public.products for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'stock_movements' and policyname = 'Allow all operations on stock_movements') then
    create policy "Allow all operations on stock_movements" on public.stock_movements for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'purchase_orders' and policyname = 'Allow all operations on purchase_orders') then
    create policy "Allow all operations on purchase_orders" on public.purchase_orders for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Allow all operations on notifications') then
    create policy "Allow all operations on notifications" on public.notifications for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'staff_members' and policyname = 'Allow all operations on staff_members') then
    create policy "Allow all operations on staff_members" on public.staff_members for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'store_settings' and policyname = 'Allow all operations on store_settings') then
    create policy "Allow all operations on store_settings" on public.store_settings for all using (true) with check (true);
  end if;
end $$;

-- Enable Realtime publication so clients can listen to live table events
do $$
begin
  begin
    alter publication supabase_realtime add table 
      public.products, 
      public.suppliers, 
      public.stock_movements, 
      public.purchase_orders, 
      public.notifications;
  exception when others then
    -- Table already in publication or publication not configured
    null;
  end;
end $$;

-- SmartStock AI — Supabase PostgreSQL Schema
-- Run this SQL script in your Supabase project's SQL Editor to provision all tables.

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

create index if not exists idx_products_sku on public.products (sku);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_movements_created_at on public.stock_movements (created_at desc);
create index if not exists idx_purchase_orders_status on public.purchase_orders (status);

/*
# Supplier Catalog Table

Allows suppliers to showcase the products/materials they can supply to the platform owner.
Separate from the main products table — this is the supplier's own offering catalog,
not the store's retail catalog.

## New Tables
- `supplier_catalog`
  - `id` (uuid, primary key)
  - `supplier_id` (uuid, FK to suppliers)
  - `name` (text) — product/material name
  - `description` (text) — detailed description
  - `category` (text) — e.g. "Raw Materials", "Electronics", "Packaging"
  - `unit` (text) — e.g. "piece", "kg", "box", "liter"
  - `unit_price` (numeric) — price per unit offered by supplier
  - `min_order_qty` (numeric) — minimum order quantity
  - `lead_time_days` (int) — how many days to fulfil an order
  - `image_url` (text) — optional product image
  - `is_available` (boolean) — whether currently available to order
  - `notes` (text) — any extra info for the admin
  - `created_at`, `updated_at`

## Security (RLS)
- Suppliers can SELECT, INSERT, UPDATE, DELETE their own catalog rows (supplier_id matches their profile.supplier_id)
- Admins (super_admin role) can SELECT all rows
- Admin cannot insert/update/delete supplier catalog items — those belong to the supplier
*/

create table if not exists public.supplier_catalog (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  name text not null,
  description text,
  category text,
  unit text not null default 'piece',
  unit_price numeric(14,2) not null default 0,
  min_order_qty numeric(14,2) not null default 1,
  lead_time_days int default 0,
  image_url text,
  is_available boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.supplier_catalog enable row level security;

do $$ begin
  create trigger supplier_catalog_touch before update on public.supplier_catalog
    for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;

create index if not exists supplier_catalog_supplier_idx on public.supplier_catalog(supplier_id);
create index if not exists supplier_catalog_available_idx on public.supplier_catalog(is_available);

-- Admin can read all catalog items
drop policy if exists "catalog_select_admin" on public.supplier_catalog;
create policy "catalog_select_admin" on public.supplier_catalog for select
  to authenticated using (public.is_admin());

-- Suppliers can read their own catalog items
drop policy if exists "catalog_select_supplier" on public.supplier_catalog;
create policy "catalog_select_supplier" on public.supplier_catalog for select
  to authenticated using (
    public.is_supplier() and supplier_id = public.current_supplier_id()
  );

-- Suppliers can insert their own catalog items
drop policy if exists "catalog_insert_supplier" on public.supplier_catalog;
create policy "catalog_insert_supplier" on public.supplier_catalog for insert
  to authenticated with check (
    public.is_supplier() and supplier_id = public.current_supplier_id()
  );

-- Suppliers can update their own catalog items
drop policy if exists "catalog_update_supplier" on public.supplier_catalog;
create policy "catalog_update_supplier" on public.supplier_catalog for update
  to authenticated
  using (public.is_supplier() and supplier_id = public.current_supplier_id())
  with check (public.is_supplier() and supplier_id = public.current_supplier_id());

-- Suppliers can delete their own catalog items
drop policy if exists "catalog_delete_supplier" on public.supplier_catalog;
create policy "catalog_delete_supplier" on public.supplier_catalog for delete
  to authenticated using (
    public.is_supplier() and supplier_id = public.current_supplier_id()
  );

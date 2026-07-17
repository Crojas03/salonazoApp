/*
# Create menu and orders tables (single-tenant, no auth)

1. New Tables
- `categories`: product categories (slug, name, sort_order)
- `products`: menu items (name, price, image_url, is_available, badge, category FK)
- `orders`: customer orders with items JSON, payment info, delivery info, status

2. Security
- Enable RLS on all tables.
- Allow anon + authenticated CRUD on all tables — this is a no-auth customer-facing
  ordering app. The anon-key frontend must be able to read categories/products and
  create/read orders.

3. Notes
- `orders.items` is a JSONB array of { product_id, name, price, quantity }.
- `orders.payment_screenshot_url` stores a base64 data URL (no storage bucket needed).
- `orders.status` defaults to 'recibido'.
*/

-- ── Categories ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE
  TO anon, authenticated USING (true);

-- ── Products ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  badge text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE
  TO anon, authenticated USING (true);

-- ── Orders ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  delivery_address text NOT NULL,
  delivery_zone text,
  payment_method text NOT NULL,
  payment_reference text,
  payment_screenshot_url text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  notas text,
  scheduled_for timestamptz,
  status text NOT NULL DEFAULT 'recibido',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_orders" ON orders;
CREATE POLICY "anon_select_orders" ON orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
CREATE POLICY "anon_delete_orders" ON orders FOR DELETE
  TO anon, authenticated USING (true);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ── Seed initial categories ─────────────────────────────────────────────────
INSERT INTO categories (slug, name, sort_order) VALUES
  ('entradas', 'Entradas', 0),
  ('burgers', 'Burgers', 1),
  ('parrilla', 'Parrilla', 2),
  ('acompanantes', 'Acompañantes', 3),
  ('bebidas', 'Bebidas', 4),
  ('postres', 'Postres', 5)
ON CONFLICT (slug) DO NOTHING;

-- ── Seed initial products ──────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, price, image_url, is_available, badge, sort_order)
SELECT c.id, p.name, p.description, p.price, p.image_url, p.is_available, p.badge, p.sort_order
FROM (VALUES
  ('entradas', 'Tequeños de Queso', '12 unidades, salsa de ajo.', 8.00, null, true, 'bestseller', 0),
  ('entradas', 'Tostones con Guasacaca', 'Crispy tostones, salsa casera.', 6.50, null, true, null, 1),
  ('burgers', 'Burger Salonazo', '200g de carne, cheddar, tocino, cebolla caramelizada.', 12.00, null, true, 'bestseller', 0),
  ('burgers', 'Chicken Burger', 'Pollo crujiente, lechuga, mayo de chipotle.', 11.00, null, true, null, 1),
  ('parrilla', 'Parrilla Mixta', 'Chorizo, morcilla, chuleta, pollo, arepa.', 18.00, null, true, 'bestseller', 0),
  ('parrilla', 'Chuleta Ahumada', 'Chuleta de cerdo ahumada con BBQ.', 14.00, null, true, null, 1),
  ('acompanantes', 'Papas Fritas', 'Crujientes, con sal de hierbas.', 4.00, null, true, null, 0),
  ('acompanantes', 'Arepa Asada', 'Arepa de maíz asada.', 2.50, null, true, null, 1),
  ('bebidas', 'Limonada Natural', 'Fresh, sin azúcar añadida.', 3.00, null, true, null, 0),
  ('bebidas', 'Malta Polar', 'Bien fría.', 2.50, null, true, null, 1),
  ('postres', 'Quesillo Casero', 'Estilo tradicional.', 5.00, null, true, 'bestseller', 0),
  ('postres', 'Brownie con Helado', 'Brownie tibio, helado de vainilla.', 6.50, null, true, null, 1)
) AS p(slug, name, description, price, image_url, is_available, badge, sort_order)
JOIN categories c ON c.slug = p.slug
ON CONFLICT DO NOTHING;

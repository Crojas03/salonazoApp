/*
# Delivery App - Schema inicial (single-tenant, sin auth)

1. Tablas nuevas
- `categories`: categorías de productos (Hamburguesas, Bebidas, etc.)
  - `id` (uuid, pk)
  - `name` (text, not null)
  - `slug` (text, unique, not null)
  - `icon` (text, nombre del icono lucide)
  - `sort_order` (int, orden de visualización)
  - `created_at` (timestamptz)
- `products`: items del catálogo
  - `id` (uuid, pk)
  - `category_id` (uuid, fk -> categories)
  - `name` (text, not null)
  - `description` (text)
  - `price` (numeric(10,2), not null)
  - `image_url` (text)
  - `is_available` (boolean, default true)
  - `sort_order` (int, orden)
  - `created_at` (timestamptz)
- `orders`: pedidos de clientes
  - `id` (uuid, pk)
  - `customer_name` (text, not null)
  - `customer_phone` (text, not null)
  - `delivery_address` (text, not null)
  - `payment_method` (text, not null, default 'pago_movil')
  - `items` (jsonb, not null) - array de {product_id, name, price, quantity}
  - `subtotal` (numeric(10,2), not null)
  - `delivery_fee` (numeric(10,2), not null, default 0)
  - `total` (numeric(10,2), not null)
  - `status` (text, default 'pending')
  - `created_at` (timestamptz)

2. Seguridad
- RLS habilitado en todas las tablas.
- Políticas anon+authenticated para lectura de categories y products (datos públicos del catálogo).
- Políticas anon+authenticated para INSERT en orders (clientes pueden crear pedidos sin login).
- No se permite UPDATE/DELETE desde el cliente anon (se gestionará desde panel admin futuro).

3. Notas
- App single-tenant sin autenticación: los clientes no necesitan login para ver el menú ni hacer pedidos.
- El pago se procesa externamente (Pago Móvil), la app solo registra el pedido.
*/

-- ==================== CATEGORIES ====================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text NOT NULL DEFAULT 'UtensilsCrossed',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_categories" ON categories;
CREATE POLICY "anon_read_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

-- ==================== PRODUCTS ====================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_products" ON products;
CREATE POLICY "anon_read_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

-- ==================== ORDERS ====================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  delivery_address text NOT NULL,
  payment_method text NOT NULL DEFAULT 'pago_movil',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total numeric(10,2) NOT NULL CHECK (total >= 0),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_read_orders" ON orders;
CREATE POLICY "anon_read_orders" ON orders FOR SELECT
  TO anon, authenticated USING (true);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

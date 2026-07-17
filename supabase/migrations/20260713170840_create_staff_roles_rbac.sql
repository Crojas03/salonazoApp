/*
# Create staff_roles table for RBAC + seed authorized operators

1. Purpose
   - Enables role-based access control (RBAC) for the El Salonazo ordering app.
   - All users log in through the same unified form using their phone number.
   - By default every user is a customer and lands on the storefront.
   - If the logged-in user's phone matches a row in `staff_roles`, they get
     access to operator panels (Admin/Kitchen, Delivery) and see a
     "Switch to Operator Mode" button in their profile menu.

2. New Tables
   - `staff_roles`
     - `id`         (uuid, primary key)
     - `phone`      (text, unique — matches the user's login phone)
     - `name`       (text — display name for the operator)
     - `role`       (text — one of: 'admin', 'cocina', 'delivery')
     - `is_active`  (boolean, default true — can deactivate without deleting)
     - `created_at` (timestamptz, default now())

3. Seed Data
   - Carlos  — admin    (full access to admin + delivery panels)
   - Jesus   — cocina   (access to admin/kitchen panel only)
   - Erick   — delivery (access to delivery panel only)
   These three can seamlessly switch between ordering food as a customer
   and operating the system without needing separate accounts.

4. Security
   - Enable RLS on `staff_roles`.
   - This is a no-auth app (phone-based login, no Supabase Auth), so the
     frontend uses the anon key. Policies use `TO anon, authenticated` so
     the anon-key client can read staff roles to determine operator access.
   - Only SELECT is allowed publicly — INSERT/UPDATE/DELETE are restricted
     to authenticated users (future admin management). For now, the anon
     client only needs to read which phones have which roles.

5. Index
   - Add index on `orders.customer_phone` for efficient "Mis Pedidos"
     order history queries (fetch by phone, order by created_at desc).
*/

CREATE TABLE IF NOT EXISTS staff_roles (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text        UNIQUE NOT NULL,
  name       text        NOT NULL,
  role       text        NOT NULL CHECK (role IN ('admin', 'cocina', 'delivery')),
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

-- SELECT: anyone (anon + authenticated) can read staff roles to check access
DROP POLICY IF EXISTS "anon_select_staff_roles" ON staff_roles;
CREATE POLICY "anon_select_staff_roles"
  ON staff_roles FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: authenticated only (future admin management UI)
DROP POLICY IF EXISTS "auth_insert_staff_roles" ON staff_roles;
CREATE POLICY "auth_insert_staff_roles"
  ON staff_roles FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_staff_roles" ON staff_roles;
CREATE POLICY "auth_update_staff_roles"
  ON staff_roles FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_staff_roles" ON staff_roles;
CREATE POLICY "auth_delete_staff_roles"
  ON staff_roles FOR DELETE
  TO authenticated
  USING (true);

-- Seed authorized operators: Carlos, Jesus, Erick
INSERT INTO staff_roles (phone, name, role, is_active) VALUES
  ('0414-1111111', 'Carlos', 'admin',    true),
  ('0414-2222222', 'Jesus',  'cocina',    true),
  ('0414-3333333', 'Erick',  'delivery',  true)
ON CONFLICT (phone) DO NOTHING;

-- Index for order history queries (fetch orders by customer phone)
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone
  ON orders (customer_phone);

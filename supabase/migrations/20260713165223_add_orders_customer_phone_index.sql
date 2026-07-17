/*
# Add index on orders.customer_phone for order history queries

1. Changes
- Add an index on the `customer_phone` column of the `orders` table.
- This speeds up the "Mis Pedidos" query that filters by `customer_phone`
  and orders by `created_at DESC`.

2. Security
- No RLS changes. The table already has anon+authenticated CRUD policies.

3. Notes
- The `customer_phone` column already exists and stores the user's phone
  number as their identifier (no auth.users FK — this is a no-auth app).
- Orders are fetched via `.eq('customer_phone', profile.phone)` in the
  OrderHistory component.
*/

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone
  ON orders (customer_phone);

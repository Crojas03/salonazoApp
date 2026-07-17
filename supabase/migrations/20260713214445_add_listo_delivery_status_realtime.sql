/*
# Add listo_delivery status + enable Supabase Realtime on orders

1. Purpose
   Expands the order status workflow from 4 steps to 5:
   recibido → preparando → listo_delivery → en_camino → entregado

   The new `listo_delivery` status represents the handoff moment where the
   kitchen marks a dish as finished and ready for the delivery driver to
   collect. This allows the Kitchen and Delivery teams to work independently:
   - Kitchen advances orders up to `listo_delivery`.
   - Delivery driver sees `listo_delivery` orders, clicks "Iniciar Viaje"
     → `en_camino`, then "Marcar Entregado" → `entregado`.

2. Schema Changes — orders table
   - Remove the old CHECK constraint on `status` that only allowed the 4
     original values ('recibido','preparando','en_camino','entregado','cancelado').
   - Add a new CHECK constraint that adds 'listo_delivery' to the allowed set.
   - This is done safely: no rows are deleted, no types changed, no data lost.

3. Supabase Realtime
   - Add the `orders` table to the `supabase_realtime` publication so that
     the Postgres CDC stream fires INSERT/UPDATE/DELETE events to the
     AdminDashboard and DeliveryPanel subscriptions.
   - Uses `IF NOT EXISTS` guard to make the migration idempotent.

4. Important Notes
   - Existing orders with status values that were previously valid remain
     untouched — the new constraint is a superset.
   - The old `status_check` constraint name is inferred from Postgres defaults
     for CHECK constraints added via ALTER TABLE. We drop by name pattern to
     be safe, then recreate it.
*/

-- Step 1: Drop the old status CHECK constraint (if any) on orders.
-- The constraint was created as part of the original migration without an
-- explicit name, so Postgres auto-named it. We look it up and drop it.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'orders'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Step 2: Add the updated CHECK constraint with listo_delivery included.
ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('recibido', 'preparando', 'listo_delivery', 'en_camino', 'entregado', 'cancelado'));

-- Step 3: Enable Supabase Realtime publication for the orders table.
-- This fires postgres_changes events to any subscribed Supabase channel.
DO $$
BEGIN
  -- Only add if not already a member of the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
END $$;

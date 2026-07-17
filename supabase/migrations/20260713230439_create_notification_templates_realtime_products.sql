/*
# Create notification_templates table + enable realtime on products

1. New Tables
   - `notification_templates` — customizable message templates per order status
     - `id`          (uuid PK)
     - `status_key`  (text, unique — maps to order status: recibido, preparando, listo_delivery, en_camino, entregado, cancelado)
     - `title`       (text — notification title)
     - `message`     (text — notification body, supports {customer_name}, {order_id}, {total} placeholders)
     - `is_active`   (boolean, default true)
     - `created_at`  (timestamptz)
     - `updated_at`  (timestamptz)

2. Seed Data
   - Default templates for all 6 order statuses

3. Realtime
   - Add `products` table to supabase_realtime publication so menu CRUD
     changes sync live to the admin dashboard.

4. Security
   - RLS enabled, anon+authenticated can read; authenticated can write.
*/

CREATE TABLE IF NOT EXISTS notification_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  status_key  text        UNIQUE NOT NULL,
  title       text        NOT NULL,
  message     text        NOT NULL,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_notif_templates" ON notification_templates;
CREATE POLICY "anon_select_notif_templates" ON notification_templates FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_notif_templates" ON notification_templates;
CREATE POLICY "auth_insert_notif_templates" ON notification_templates FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_notif_templates" ON notification_templates;
CREATE POLICY "auth_update_notif_templates" ON notification_templates FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_notif_templates" ON notification_templates;
CREATE POLICY "auth_delete_notif_templates" ON notification_templates FOR DELETE
  TO authenticated USING (true);

-- Seed default templates
INSERT INTO notification_templates (status_key, title, message) VALUES
  ('recibido',       '¡Pedido Recibido!',       'Hola {customer_name}, hemos recibido tu pedido #{order_id}. Total: ${total}. Lo estaremos preparando en breve.'),
  ('preparando',     'En Preparación',           'Buenas noticias {customer_name}, tu pedido #{order_id} ya está siendo preparado por nuestro equipo de cocina.'),
  ('listo_delivery', 'Listo para Entrega',       'Tu pedido #{order_id} está listo. Nuestro repartidor lo recogerá en un momento, {customer_name}.'),
  ('en_camino',      '¡En Camino!',              'Tu pedido #{order_id} va en camino a {customer_name}. ¡Prepárate para recibirlo!'),
  ('entregado',      'Pedido Entregado',         '¡Listo {customer_name}! Tu pedido #{order_id} fue entregado. ¡Gracias por elegirnos!'),
  ('cancelado',      'Pedido Cancelado',         'Lo sentimos {customer_name}, tu pedido #{order_id} fue cancelado. Contacta con nosotros si tienes dudas.')
ON CONFLICT (status_key) DO NOTHING;

-- Enable realtime on products table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  END IF;
END $$;

-- Enable realtime on notification_templates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notification_templates') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notification_templates;
  END IF;
END $$;

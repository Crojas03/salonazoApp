CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  message     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Anyone can read notifications (public marketing messages)
CREATE POLICY "anon_select_notifications" ON notifications
  FOR SELECT TO anon, authenticated USING (true);

-- Only anon (admin panel uses anon key) can insert
CREATE POLICY "anon_insert_notifications" ON notifications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Seed with two initial notifications
INSERT INTO notifications (title, message) VALUES
  ('¡2x1 en Hamburguesas solo por hoy! 🍔', 'Pide dos hamburguesas clásicas y paga solo una. Válido lunes y martes hasta agotar existencias.'),
  ('Nuevo plato: Parrilla Especial del Chef 🔥', 'Descubre nuestra nueva Parrilla Especial: corte de res premium, costillas BBQ y pollo ahumado para dos personas.');

-- Add original_price (for strike-through) and badge columns to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS original_price numeric,
  ADD COLUMN IF NOT EXISTS badge text; -- 'bestseller' | 'new' | 'promo' | null

-- Insert Promociones category
INSERT INTO categories (name, slug, icon, sort_order)
VALUES ('Promociones', 'promociones', '🔖', 0)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample promo products
DO $$
DECLARE
  promo_cat_id uuid;
BEGIN
  SELECT id INTO promo_cat_id FROM categories WHERE slug = 'promociones';

  INSERT INTO products (category_id, name, description, price, original_price, image_url, badge, is_available, sort_order)
  VALUES
    (promo_cat_id,
     'Combo Parrilla Familiar',
     'Churrasco + costillas + pollo a la parrilla para 4 personas, con yuca frita, ensalada y salsas',
     24.99, 34.99,
     'https://images.pexels.com/photos/410648/pexels-photo-410648.jpeg?auto=compress&cs=tinysrgb&w=600',
     'promo', true, 1),
    (promo_cat_id,
     '2x1 Hamburguesa Clásica',
     'Dos hamburguesas con carne 180g, lechuga, tomate, cebolla caramelizada y papas fritas. Válido lunes y martes',
     9.99, 18.99,
     'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600',
     'promo', true, 2),
    (promo_cat_id,
     'Menú del Día',
     'Plato principal del chef + sopa del día + bebida natural + postre. Cambia cada día',
     11.99, 16.99,
     'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600',
     'promo', true, 3)
  ON CONFLICT DO NOTHING;
END $$;

-- Mark some existing products with badges
UPDATE products SET badge = 'bestseller'
WHERE name IN ('Churrasco a la Parrilla', 'Hamburguesa Gourmet', 'Jugo de Parchita Natural')
AND badge IS NULL;

UPDATE products SET badge = 'new'
WHERE name IN ('Mousse de Chocolate Premium', 'Tiradito de Atún')
AND badge IS NULL;

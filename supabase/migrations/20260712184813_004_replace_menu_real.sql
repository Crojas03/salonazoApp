-- Limpiar datos de prueba conservando la estructura
TRUNCATE TABLE orders RESTART IDENTITY CASCADE;
TRUNCATE TABLE products RESTART IDENTITY CASCADE;
TRUNCATE TABLE categories RESTART IDENTITY CASCADE;

-- ─────────────────────────────────────────────
-- CATEGORÍAS REALES
-- ─────────────────────────────────────────────
INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Entradas',         'entradas',   'utensils',  1),
  ('Platos Principales','principales','drumstick', 2),
  ('Bebidas',          'bebidas',    'cup',        3),
  ('Postres',          'postres',    'icecream',  4);

-- ─────────────────────────────────────────────
-- ENTRADAS
-- ─────────────────────────────────────────────
INSERT INTO products (category_id, name, description, price, image_url, is_available, sort_order)
SELECT id, 'Tequeños de Queso', 'Palitos de masa de pan rellenos de queso blanco venezolano, fritos hasta dorar. Servidos con guasacaca casera.', 4.50,
  'https://images.pexels.com/photos/6210747/pexels-photo-6210747.jpeg?auto=compress&cs=tinysrgb&w=600', true, 1
FROM categories WHERE slug = 'entradas';

INSERT INTO products (category_id, name, description, price, image_url, is_available, sort_order)
SELECT id, 'Ceviche de Camarones', 'Camarones frescos marinados en limón, con cebolla morada, cilantro, tomate y ají picante. Servido con patacones.', 7.00,
  'https://images.pexels.com/photos/8697541/pexels-photo-8697541.jpeg?auto=compress&cs=tinysrgb&w=600', true, 2
FROM categories WHERE slug = 'entradas';

INSERT INTO products (category_id, name, description, price, image_url, is_available, sort_order)
SELECT id, 'Tabla de Embutidos', 'Selección de jamón serrano, chorizo, queso manchego y aceitunas. Acompañada de pan tostado artesanal y mermelada de ají.', 9.50,
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', true, 3
FROM categories WHERE slug = 'entradas';

-- ─────────────────────────────────────────────
-- PLATOS PRINCIPALES
-- ─────────────────────────────────────────────
INSERT INTO products (category_id, name, description, price, image_url, is_available, sort_order)
SELECT id, 'Pabellón Criollo', 'El plato insignia venezolano: carne mechada, caraotas negras, arroz blanco y tajadas de plátano maduro fritas. Incluye arepa.', 12.00,
  'https://images.pexels.com/photos/5836427/pexels-photo-5836427.jpeg?auto=compress&cs=tinysrgb&w=600', true, 1
FROM categories WHERE slug = 'principales';

INSERT INTO products (category_id, name, description, price, image_url, is_available, sort_order)
SELECT id, 'Pollo a la Brasa', 'Pollo entero marinado con especias criollas, asado a la brasa lentamente. Servido con papas fritas, ensalada y salsas de la casa.', 14.50,
  'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=600', true, 2
FROM categories WHERE slug = 'principales';

INSERT INTO products (category_id, name, description, price, image_url, is_available, sort_order)
SELECT id, 'Churrasco con Chimichurri', 'Corte de res de 300g a la parrilla, término a elección. Acompañado de chimichurri argentino, papas gratinadas y ensalada mixta.', 18.00,
  'https://images.pexels.com/photos/1251208/pexels-photo-1251208.jpeg?auto=compress&cs=tinysrgb&w=600', true, 3
FROM categories WHERE slug = 'principales';

INSERT INTO products (category_id, name, description, price, image_url, is_available, sort_order)
SELECT id, 'Pasta al Pesto con Pollo', 'Linguine al dente con salsa pesto genovés (albahaca, parmesano, piñones, ajo), pechuga de pollo a la plancha y tomates cherry.', 11.00,
  'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', true, 4
FROM categories WHERE slug = 'principales';

-- ─────────────────────────────────────────────
-- BEBIDAS
-- ─────────────────────────────────────────────
INSERT INTO products (category_id, name, description, price, image_url, is_available, sort_order)
SELECT id, 'Limonada Natural', 'Limonada fresca exprimida al momento con menta, un toque de miel y hielo granizado. Sin azúcar añadida.', 2.50,
  'https://images.pexels.com/photos/2109099/pexels-photo-2109099.jpeg?auto=compress&cs=tinysrgb&w=600', true, 1
FROM categories WHERE slug = 'bebidas';

INSERT INTO products (category_id, name, description, price, image_url, is_available, sort_order)
SELECT id, 'Jugo de Parchita', 'Maracuyá natural licuado con agua, azúcar y hielo. Sabor tropical intenso y refrescante. 16 oz.', 3.00,
  'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=600', true, 2
FROM categories WHERE slug = 'bebidas';

INSERT INTO products (category_id, name, description, price, image_url, is_available, sort_order)
SELECT id, 'Refresco en Lata', 'Selección de Coca-Cola, Pepsi, Seven Up o Malta Polar. Bien fría, 354 ml.', 1.50,
  'https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg?auto=compress&cs=tinysrgb&w=600', true, 3
FROM categories WHERE slug = 'bebidas';

-- ─────────────────────────────────────────────
-- POSTRES
-- ─────────────────────────────────────────────
INSERT INTO products (category_id, name, description, price, image_url, is_available, sort_order)
SELECT id, 'Quesillo Venezolano', 'Flan de queso crema estilo venezolano, caramelizado artesanalmente. Textura suave y cremosa, servido frío.', 4.00,
  'https://images.pexels.com/photos/3026804/pexels-photo-3026804.jpeg?auto=compress&cs=tinysrgb&w=600', true, 1
FROM categories WHERE slug = 'postres';

INSERT INTO products (category_id, name, description, price, image_url, is_available, sort_order)
SELECT id, 'Brownie con Helado', 'Brownie de chocolate negro caliente, servido con una bola de helado de vainilla artesanal y sirope de chocolate.', 5.50,
  'https://images.pexels.com/photos/45202/brownie-dessert-cake-sweet-45202.jpeg?auto=compress&cs=tinysrgb&w=600', true, 2
FROM categories WHERE slug = 'postres';

INSERT INTO products (category_id, name, description, price, image_url, is_available, sort_order)
SELECT id, 'Tres Leches', 'Bizcocho húmedo empapado en tres tipos de leche (entera, evaporada y condensada), cubierto con nata chantilly y canela.', 4.50,
  'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', true, 3
FROM categories WHERE slug = 'postres';

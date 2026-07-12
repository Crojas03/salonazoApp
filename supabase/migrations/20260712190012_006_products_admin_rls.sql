-- Allow anon/authenticated to manage products (admin panel uses anon key)
CREATE POLICY "anon_select_products" ON products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_products" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_products" ON products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_products" ON products FOR DELETE TO anon, authenticated USING (true);

-- Allow anon to read categories
CREATE POLICY "anon_select_categories" ON categories FOR SELECT TO anon, authenticated USING (true);

-- Allow anon to read all orders (for sales report)
DROP POLICY IF EXISTS "select_own_orders" ON orders;
CREATE POLICY "anon_select_orders" ON orders FOR SELECT TO anon, authenticated USING (true);

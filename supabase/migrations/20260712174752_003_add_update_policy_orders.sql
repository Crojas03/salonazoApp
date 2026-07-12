/*
# Delivery App - Permitir UPDATE en orders para cambios de estado

1. Seguridad
   - Añade política UPDATE en la tabla `orders` para que el panel de admin (sin auth, single-tenant) pueda cambiar el estado de los pedidos (recibido -> en_cocina -> listo_despacho).
   - Rol: `anon, authenticated` ya que la app no tiene login todavía.
   - En una fase futura con autenticación, esta política se restringirá a usuarios con rol de staff/admin.

2. Notas
   - No se eliminan ni modifican políticas existentes.
   - No hay cambios en columnas ni datos.
*/

DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

/*
# Delivery App - Ampliar tabla orders para Pago Móvil y zonas de entrega

1. Tabla modificada: `orders`
   - `payment_reference` (text) — Número de referencia del Pago Móvil que el cliente ingresa manualmente.
   - `delivery_zone` (text) — Nombre de la zona de entrega elegida por el cliente (ej. "Zona A").
   - `payment_screenshot_url` (text) — URL de la captura de pantalla del pago (simulada por ahora; quedará en null si no se adjunta).
   - `status` — cambia el valor por defecto de 'pending' a 'recibido' para reflejar el estado inicial del pedido al confirmarlo el cliente.

2. Seguridad
   - No se eliminan ni renombran columnas existentes; no hay pérdida de datos.
   - Las políticas RLS existentes (anon insert + anon read) siguen vigentes y cubren las nuevas columnas automáticamente.

3. Notas
   - Las nuevas columnas aceptan NULL para que los pedidos existentes (si los hay) no se rompan.
   - El frontend enviará payment_reference, delivery_zone y opcionalmente payment_screenshot_url al insertar.
*/

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS delivery_zone text,
  ADD COLUMN IF NOT EXISTS payment_screenshot_url text;

ALTER TABLE orders
  ALTER COLUMN status SET DEFAULT 'recibido';

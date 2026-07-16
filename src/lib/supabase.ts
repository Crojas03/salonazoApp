import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
);

export type Category = { id: string; slug: string; name: string; sort_order: number };
export type Product = {
  id: string; category_id: string; name: string; description: string | null;
  price: number; original_price: number | null; image_url: string | null;
  is_available: boolean; badge: string | null; sort_order: number;
};
export type CartItem = { product: Product; quantity: number };

export type OrderStatus = 'recibido' | 'preparando' | 'listo_delivery' | 'en_camino' | 'entregado' | 'cancelado';
export const STATUS_FLOW: readonly OrderStatus[] = ['recibido', 'preparando', 'listo_delivery', 'en_camino', 'entregado'] as const;

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; badgeColor: string; dot: string }> = {
  recibido:       { label: 'Recibido',           color: 'text-blue-700',    bg: 'bg-blue-50',    badgeColor: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  preparando:     { label: 'Preparando',         color: 'text-amber-700',   bg: 'bg-amber-50',   badgeColor: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  listo_delivery: { label: 'Listo para Entrega', color: 'text-emerald-700', bg: 'bg-emerald-50', badgeColor: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  en_camino:      { label: 'En Camino',          color: 'text-purple-700',  bg: 'bg-purple-50',  badgeColor: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-500' },
  entregado:      { label: 'Entregado',          color: 'text-green-700',   bg: 'bg-green-50',   badgeColor: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  cancelado:      { label: 'Cancelado',          color: 'text-red-700',     bg: 'bg-red-50',     badgeColor: 'bg-red-100 text-red-700',     dot: 'bg-red-500' },
};

export const KITCHEN_ADVANCE_LABEL: Record<string, string> = {
  recibido: 'Confirmar y Preparar',
  preparando: 'Listo para Entrega',
};

export type OrderRow = {
  id: string; customer_name: string; customer_phone: string;
  delivery_address: string; delivery_zone: string | null;
  payment_method: string; payment_reference: string | null;
  items: { product_id: string; name: string; price: number; quantity: number }[];
  subtotal: number; delivery_fee: number; total: number;
  notas: string | null; scheduled_for: string | null;
  status: string; created_at: string;
};

export type StaffRole = 'admin' | 'cocina' | 'delivery';
export const ROLE_LABELS: Record<StaffRole, string> = { admin: 'Administrador', cocina: 'Cocina', delivery: 'Repartidor' };
export type StaffRoleRow = { id: string; phone: string; name: string; role: StaffRole; is_active: boolean; created_at: string };

export type NotificationTemplate = {
  id: string; status_key: string; title: string; message: string;
  is_active: boolean; created_at: string; updated_at: string;
};

export type ZoneTier = 'cerca' | 'media' | 'lejos';
export const ZONE_TIER_LABEL: Record<ZoneTier, string> = { cerca: 'Cerca (≤ 3 km)', media: 'Zona media (3–6 km)', lejos: 'Lejos (6–10 km)' };
export type DeliveryZone = { id: string; name: string; fee: number; tier: ZoneTier };
export const RESTAURANT_COORDS = { lat: 10.4806, lng: -66.9036 };
export const DELIVERY_ZONES: DeliveryZone[] = [
  { id: 'ccs-centro', name: 'Centro CCS', fee: 2.0, tier: 'cerca' },
  { id: 'chacao', name: 'Chacao', fee: 2.5, tier: 'cerca' },
  { id: 'baruta', name: 'Baruta', fee: 3.0, tier: 'media' },
  { id: 'sucre', name: 'Sucre', fee: 3.5, tier: 'media' },
  { id: 'el-hatillo', name: 'El Hatillo', fee: 4.5, tier: 'lejos' },
  { id: 'catia', name: 'Catia', fee: 4.0, tier: 'lejos' },
];


export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export function gpsDeliveryFee(lat: number, lng: number): number {
  return Math.min(6, Math.max(1.5, 1.5 + haversineKm(RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng, lat, lng) * 0.5));
}

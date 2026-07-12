import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
  created_at: string;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  image_url: string;
  badge: 'bestseller' | 'new' | 'promo' | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
};

// ─── GPS Delivery Pricing ─────────────────────────────────────────────────────
export const RESTAURANT_COORDS = { lat: 8.297, lng: -62.711 } as const;
export const DELIVERY_RATE_PER_KM = 1.0;
export const DELIVERY_MIN_FEE = 1.5;
// BCV official rate (Bs per $1 USD) — update when rate changes
export const BCV_RATE = 48.50;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function gpsDeliveryFee(lat: number, lng: number): number {
  const km = haversineKm(RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng, lat, lng);
  return Math.max(DELIVERY_MIN_FEE, Math.round(km * DELIVERY_RATE_PER_KM * 100) / 100);
}

export type CartItem = {
  product: Product;
  quantity: number;
};

export type OrderItem = {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
};

export type DeliveryZone = {
  id: string;
  name: string;
  fee: number;
  tier: 'cerca' | 'media' | 'lejos';
};

// Sectores reales con tarifas diferenciadas
export const DELIVERY_ZONES: DeliveryZone[] = [
  // Zonas cercanas — $1.50
  { id: 'castillito',    name: 'Castillito',          fee: 1.5,  tier: 'cerca' },
  { id: 'altavista',     name: 'Altavista',            fee: 1.5,  tier: 'cerca' },
  { id: 'centro',        name: 'Centro',               fee: 1.5,  tier: 'cerca' },
  // Zonas intermedias — $3.00
  { id: 'unare',         name: 'Unare',                fee: 3.0,  tier: 'media' },
  { id: 'la_hacienda',   name: 'La Hacienda',          fee: 3.0,  tier: 'media' },
  { id: 'cana_de_azucar',name: 'Caña de Azúcar',      fee: 3.0,  tier: 'media' },
  { id: 'villa_bavaria', name: 'Villa Bavaria',        fee: 3.0,  tier: 'media' },
  // Zonas alejadas — $4.50
  { id: 'chilemex',      name: 'Chilemex',             fee: 4.5,  tier: 'lejos' },
  { id: 'barrio_nuevo',  name: 'Barrio Nuevo',         fee: 4.5,  tier: 'lejos' },
  { id: 'agua_blanca',   name: 'Agua Blanca',          fee: 4.5,  tier: 'lejos' },
  { id: 'mata_palo',     name: 'Mata Palo',            fee: 4.5,  tier: 'lejos' },
];

export const ZONE_TIER_LABEL: Record<DeliveryZone['tier'], string> = {
  cerca: 'Zona Cercana',
  media: 'Zona Intermedia',
  lejos: 'Zona Alejada',
};

export type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_zone: string;
  payment_method: string;
  payment_reference: string;
  payment_screenshot_url: string | null;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  notas: string | null;
  status: string;
  created_at: string;
};

export type DbNotification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

// Order status flow
export type OrderStatus =
  | 'recibido'
  | 'en_cocina'
  | 'listo_despacho'
  | 'en_camino'
  | 'entregado';

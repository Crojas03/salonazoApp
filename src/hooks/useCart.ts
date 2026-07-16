import { useCallback, useEffect, useState } from 'react';
import type { CartItem, Product } from '../lib/supabase';

const STORAGE_KEY = 'delivery-cart-v1';
type CouponDef = { type: 'percent'; value: number } | { type: 'fixed'; value: number };
const COUPONS: Record<string, CouponDef> = { BIENVENIDO: { type: 'percent', value: 10 }, SALONAZOPRO: { type: 'fixed', value: 5 }, CUMPLESALONAZO: { type: 'percent', value: 15 } };
export type CouponResult = { valid: true; code: string; description: string; discount: number } | { valid: false; error: string };

function loadCart(): CartItem[] { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) as CartItem[] : []; } catch { return []; } }
function applyCoupon(code: string, sub: number): CouponResult {
  const d = COUPONS[code.trim().toUpperCase()];
  if (!d) return { valid: false, error: 'Cupón inválido' };
  const disc = d.type === 'percent' ? Math.min(parseFloat((sub * d.value / 100).toFixed(2)), sub) : Math.min(d.value, sub);
  return { valid: true, code: code.trim().toUpperCase(), description: d.type === 'percent' ? `${d.value}% off` : `$${d.value} off`, discount: disc };
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [coupon, setCoupon] = useState<(CouponResult & { valid: true }) | null>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }, [items]);
  useEffect(() => { if (coupon) { const s = items.reduce((a, i) => a + Number(i.product.price) * i.quantity, 0); const r = applyCoupon(coupon.code, s); setCoupon(r.valid ? r : null); } }, [items]);

  const addItem = useCallback((p: Product) => setItems(prev => { const e = prev.find(i => i.product.id === p.id); return e ? prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { product: p, quantity: 1 }]; }), []);
  const removeItem = useCallback((id: string) => setItems(prev => prev.filter(i => i.product.id !== id)), []);
  const incrementItem = useCallback((id: string) => setItems(prev => prev.map(i => i.product.id === id ? { ...i, quantity: i.quantity + 1 } : i)), []);
  const decrementItem = useCallback((id: string) => setItems(prev => prev.map(i => i.product.id === id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0)), []);
  const clearCart = useCallback(() => { setItems([]); setDeliveryFee(0); setCoupon(null); }, []);
  const redeemCoupon = useCallback((c: string): CouponResult => { const s = items.reduce((a, i) => a + Number(i.product.price) * i.quantity, 0); const r = applyCoupon(c, s); if (r.valid) setCoupon(r); return r; }, [items]);
  const removeCoupon = useCallback(() => setCoupon(null), []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
  const discount = coupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount + deliveryFee);

  return { items, addItem, removeItem, incrementItem, decrementItem, clearCart, totalItems, subtotal, discount, coupon, redeemCoupon, removeCoupon, deliveryFee, setDeliveryFee, total };
}

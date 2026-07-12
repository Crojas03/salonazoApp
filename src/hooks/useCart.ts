import { useCallback, useEffect, useState } from 'react';
import type { CartItem, Product } from '../lib/supabase';

const STORAGE_KEY = 'delivery-cart-v1';

// Coupon definitions — add more here as needed
type CouponDef = { type: 'percent'; value: number } | { type: 'fixed'; value: number };

const COUPONS: Record<string, CouponDef> = {
  BIENVENIDO:      { type: 'percent', value: 10 },
  SALONAZOPRO:     { type: 'fixed',   value: 5  },
  CUMPLESALONAZO:  { type: 'percent', value: 15 },
};

export type CouponResult =
  | { valid: true;  code: string; description: string; discount: number }
  | { valid: false; error: string };

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

function applyCoupon(code: string, subtotal: number): CouponResult {
  const def = COUPONS[code.trim().toUpperCase()];
  if (!def) return { valid: false, error: 'Cupón inválido o expirado' };
  const discount =
    def.type === 'percent'
      ? Math.min(parseFloat((subtotal * def.value / 100).toFixed(2)), subtotal)
      : Math.min(def.value, subtotal);
  const description =
    def.type === 'percent' ? `${def.value}% de descuento` : `$${def.value.toFixed(2)} de descuento`;
  return { valid: true, code: code.trim().toUpperCase(), description, discount };
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [coupon, setCoupon] = useState<CouponResult & { valid: true } | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Re-compute coupon discount whenever items change
  useEffect(() => {
    if (coupon) {
      const sub = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
      const refreshed = applyCoupon(coupon.code, sub);
      setCoupon(refreshed.valid ? refreshed : null);
    }
  }, [items]);

  const addItem = useCallback((product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const incrementItem = useCallback((productId: string) => {
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity + 1 } : i));
  }, []);

  const decrementItem = useCallback((productId: string) => {
    setItems(prev =>
      prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i)
          .filter(i => i.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDeliveryFee(0);
    setCoupon(null);
  }, []);

  const redeemCoupon = useCallback((code: string): CouponResult => {
    const sub = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
    const result = applyCoupon(code, sub);
    if (result.valid) setCoupon(result);
    return result;
  }, [items]);

  const removeCoupon = useCallback(() => setCoupon(null), []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal   = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
  const discount   = coupon?.discount ?? 0;
  const total      = Math.max(0, subtotal - discount + deliveryFee);

  return {
    items,
    addItem,
    removeItem,
    incrementItem,
    decrementItem,
    clearCart,
    totalItems,
    subtotal,
    discount,
    coupon,
    redeemCoupon,
    removeCoupon,
    deliveryFee,
    setDeliveryFee,
    total,
  };
}

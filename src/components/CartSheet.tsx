import { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, NotebookPen, Tag, CheckCircle2, XCircle } from 'lucide-react';
import type { CartItem } from '../lib/supabase';
import { BCV_RATE } from '../lib/supabase';
import type { CouponResult } from '../hooks/useCart';

type Props = {
  open: boolean;
  items: CartItem[];
  subtotal: number;
  discount: number;
  coupon: (CouponResult & { valid: true }) | null;
  deliveryFee: number;
  total: number;
  notas: string;
  onNotasChange: (value: string) => void;
  onClose: () => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  onRedeemCoupon: (code: string) => CouponResult;
  onRemoveCoupon: () => void;
};

export function CartSheet({
  open, items, subtotal, discount, coupon, deliveryFee, total,
  notas, onNotasChange,
  onClose, onIncrement, onDecrement, onRemove, onCheckout,
  onRedeemCoupon, onRemoveCoupon,
}: Props) {
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    const result = onRedeemCoupon(couponInput);
    if (!result.valid) {
      setCouponError(result.error);
    } else {
      setCouponError('');
      setCouponInput('');
    }
  };

  const handleRemoveCoupon = () => {
    onRemoveCoupon();
    setCouponInput('');
    setCouponError('');
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '90vh' }}
      >
        {/* Handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-bold text-gray-900">Tu carrito</h2>
            {items.length > 0 && (
              <span className="text-sm text-gray-400 font-medium">
                ({items.reduce((s, i) => s + i.quantity, 0)} items)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center active:scale-90 transition-all"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 font-medium">Tu carrito está vacío</p>
              <p className="text-sm text-gray-300 mt-1">Añade productos del menú</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    {item.product.image_url
                      ? <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🍽</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{item.product.name}</h4>
                    <p className="text-sm font-bold text-orange-500 mt-0.5">
                      ${(Number(item.product.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onDecrement(item.product.id)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center active:scale-90 transition-all">
                      <Minus className="w-3.5 h-3.5 text-gray-600" strokeWidth={2.5} />
                    </button>
                    <span className="w-6 text-center font-bold text-gray-900 text-sm">{item.quantity}</span>
                    <button onClick={() => onIncrement(item.product.id)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center active:scale-90 transition-all">
                      <Plus className="w-3.5 h-3.5 text-gray-600" strokeWidth={2.5} />
                    </button>
                    <button onClick={() => onRemove(item.product.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center active:scale-90 transition-all ml-1" aria-label="Eliminar">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-5 pt-3 pb-6 border-t border-gray-100 bg-white space-y-4">
            {/* Notas */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                <NotebookPen className="w-3.5 h-3.5" />
                Notas para la cocina
              </label>
              <textarea
                rows={2}
                value={notas}
                onChange={e => onNotasChange(e.target.value)}
                placeholder="Ej: Sin cebolla, salsas aparte, término bien cocido..."
                maxLength={300}
                className="w-full px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-amber-300 transition-all resize-none leading-relaxed"
              />
              {notas.length > 0 && (
                <p className="text-right text-[11px] text-gray-300 mt-1">{notas.length}/300</p>
              )}
            </div>

            {/* Coupon */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                <Tag className="w-3.5 h-3.5" />
                Cupón de descuento
              </label>

              {coupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-700">{coupon.code}</p>
                      <p className="text-[11px] text-emerald-600">{coupon.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="w-7 h-7 rounded-lg hover:bg-emerald-100 flex items-center justify-center transition-all"
                    aria-label="Quitar cupón"
                  >
                    <X className="w-4 h-4 text-emerald-500" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                      placeholder="Ej: BIENVENIDO"
                      maxLength={20}
                      className={`flex-1 px-3.5 py-2.5 rounded-xl border text-sm font-mono text-gray-800 placeholder:text-gray-300 placeholder:font-sans focus:outline-none transition-colors ${
                        couponError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white focus:border-gray-400'
                      }`}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-700 text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-30"
                    >
                      Aplicar
                    </button>
                  </div>
                  {couponError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-500 font-medium">
                      <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {couponError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="font-semibold text-gray-700">${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600 font-medium">Descuento ({coupon?.code})</span>
                  <span className="font-bold text-emerald-600">-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Envío</span>
                <span className="font-semibold text-gray-700">
                  {deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : 'Se calcula en el checkout'}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100 items-end">
                <span className="font-bold text-gray-900">Total</span>
                <div className="text-right">
                  <span className="font-black text-lg text-orange-500">${total.toFixed(2)}</span>
                  <p className="text-[10px] text-gray-400 font-medium">Bs. {(total * BCV_RATE).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <button
              onClick={onCheckout}
              className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-base active:scale-[0.98] transition-all shadow-lg shadow-orange-500/30"
            >
              Continuar al pago
            </button>
          </div>
        )}
      </div>
    </>
  );
}

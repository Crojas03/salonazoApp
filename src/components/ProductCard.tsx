import { Plus, Minus } from 'lucide-react';
import type { Product } from '../lib/supabase';

type Props = {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
};

const BADGE_CONFIG = {
  bestseller: { label: '🔥 El más vendido', cls: 'bg-orange-500 text-white' },
  new:        { label: '✨ Nuevo',           cls: 'bg-blue-500 text-white'   },
  promo:      { label: '🔖 Oferta',          cls: 'bg-emerald-500 text-white' },
} as const;

export function ProductCard({ product, quantity, onAdd, onIncrement, onDecrement }: Props) {
  const badge = product.badge ? BADGE_CONFIG[product.badge] : null;
  const hasDiscount = product.original_price != null && product.original_price > product.price;

  return (
    <div className={`relative bg-white rounded-2xl overflow-hidden shadow-sm border transition-shadow hover:shadow-md ${
      !product.is_available ? 'opacity-60' : 'border-gray-100'
    }`}>
      {/* Badge */}
      {badge && (
        <span className={`absolute top-2.5 left-2.5 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${badge.cls}`}>
          {badge.label}
        </span>
      )}

      <div className="flex gap-0 items-stretch">
        {/* Image */}
        <div className="w-28 flex-shrink-0 relative">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover"
              style={{ minHeight: 104, maxHeight: 120 }}
            />
          ) : (
            <div className="w-full h-full min-h-[104px] bg-gray-100 flex items-center justify-center">
              <span className="text-3xl opacity-30">🍽</span>
            </div>
          )}
          {/* Agotado overlay */}
          {!product.is_available && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="text-[10px] font-bold text-gray-500 bg-white rounded-full px-2 py-0.5 shadow-sm">
                Agotado
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between px-3.5 py-3">
          <div>
            <h3 className="font-bold text-gray-900 text-[15px] leading-tight line-clamp-1">
              {product.name}
            </h3>
            <p className="text-[11px] text-gray-400 leading-snug mt-0.5 line-clamp-2">
              {product.description}
            </p>
          </div>

          <div className="flex items-end justify-between mt-2">
            {/* Price */}
            <div className="flex flex-col items-start">
              {hasDiscount && (
                <span className="text-[11px] text-gray-400 line-through leading-none">
                  ${Number(product.original_price).toFixed(2)}
                </span>
              )}
              <span className={`text-lg font-black leading-tight ${hasDiscount ? 'text-emerald-600' : 'text-gray-900'}`}>
                ${Number(product.price).toFixed(2)}
              </span>
            </div>

            {/* Add / counter */}
            {quantity === 0 ? (
              <button
                onClick={onAdd}
                disabled={!product.is_available}
                className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all shadow-sm shadow-orange-500/30 disabled:opacity-40 disabled:shadow-none"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                Añadir
              </button>
            ) : (
              <div className="flex items-center bg-gray-900 rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={onDecrement}
                  className="w-8 h-8 flex items-center justify-center text-white hover:bg-gray-700 active:scale-90 transition-all"
                  aria-label="Quitar uno"
                >
                  <Minus className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
                <span className="w-6 text-center text-white text-sm font-bold tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={onIncrement}
                  className="w-8 h-8 flex items-center justify-center text-white hover:bg-gray-700 active:scale-90 transition-all"
                  aria-label="Añadir uno"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Plus, Minus, Star } from 'lucide-react';
import type { Product } from '../lib/supabase';
type P = { product: Product; quantity: number; onAdd: () => void; onIncrement: () => void; onDecrement: () => void };
export function ProductCard({ product, quantity, onAdd, onIncrement, onDecrement }: P) {
  const hasDiscount = product.original_price != null && Number(product.original_price) > Number(product.price);
  const pct = hasDiscount ? Math.round((1 - Number(product.price) / Number(product.original_price)) * 100) : 0;
  return (
    <div className="flex gap-3 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
        {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">🍽</div>}
        {hasDiscount && <span className="absolute top-0 left-0 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-br-lg rounded-tl-xl">-{pct}%</span>}
        {product.badge === 'bestseller' && !hasDiscount && <span className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg rounded-tr-xl flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-white" />TOP</span>}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div><h3 className="font-bold text-gray-900 text-sm leading-tight">{product.name}</h3>{product.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{product.description}</p>}</div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-baseline gap-1.5"><span className="font-black text-orange-500 text-base">${Number(product.price).toFixed(2)}</span>{hasDiscount && <span className="text-xs text-gray-300 line-through">${Number(product.original_price).toFixed(2)}</span>}</div>
          {quantity > 0 ? (
            <div className="flex items-center gap-1.5 animate-scale-in">
              <button onClick={onDecrement} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center active:scale-90 transition-all"><Minus className="w-3.5 h-3.5 text-gray-700" strokeWidth={2.5} /></button>
              <span className="w-6 text-center font-black text-gray-900 text-sm">{quantity}</span>
              <button onClick={onIncrement} className="w-7 h-7 rounded-lg bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center active:scale-90 transition-all shadow-sm shadow-orange-500/30"><Plus className="w-3.5 h-3.5" strokeWidth={2.5} /></button>
            </div>
          ) : <button onClick={onAdd} className="w-7 h-7 rounded-lg bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center active:scale-90 transition-all shadow-sm shadow-orange-500/30"><Plus className="w-3.5 h-3.5" strokeWidth={2.5} /></button>}
        </div>
      </div>
    </div>
  );
}

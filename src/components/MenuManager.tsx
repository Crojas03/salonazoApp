import { useEffect, useState } from 'react';
import {
  Plus, Trash2, ToggleLeft, ToggleRight,
  Loader2, AlertCircle, CheckCircle2, ImageOff, ChevronDown,
} from 'lucide-react';
import { supabase, type Category, type Product } from '../lib/supabase';

type FormData = {
  name: string;
  description: string;
  price: string;
  category_id: string;
  image_url: string;
};

const EMPTY: FormData = { name: '', description: '', price: '', category_id: '', image_url: '' };

function ProductRow({
  product,
  onToggle,
  onDelete,
}: {
  product: Product;
  onToggle: (id: string, val: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  return (
    <div className={`flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 ${busy ? 'opacity-60' : ''}`}>
      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-gray-300" /></div>
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${product.is_available ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
          {product.name}
        </p>
        <p className="text-xs text-gray-400">${Number(product.price).toFixed(2)}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => act(() => onToggle(product.id, !product.is_available))}
          disabled={busy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95"
          style={{
            background: product.is_available ? '#f0fdf4' : '#fef2f2',
            color: product.is_available ? '#16a34a' : '#dc2626',
          }}
        >
          {product.is_available
            ? <><ToggleRight className="w-3.5 h-3.5" />Disponible</>
            : <><ToggleLeft className="w-3.5 h-3.5" />Agotado</>
          }
        </button>
        <button
          onClick={() => act(() => onDelete(product.id))}
          disabled={busy}
          className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-all active:scale-90"
          aria-label="Eliminar"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );
}

export function MenuManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [filterCat, setFilterCat] = useState<string>('all');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').order('sort_order'),
    ]);
    if (catRes.data) setCategories(catRes.data);
    if (prodRes.data) setProducts(prodRes.data);
    if (!form.category_id && catRes.data?.length) {
      setForm(f => ({ ...f, category_id: catRes.data[0].id }));
    }
    setLoading(false);
  }

  function showToast(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  const field = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) { showToast('err', 'Precio inválido'); return; }
    setSaving(true);
    const nextOrder = products.filter(p => p.category_id === form.category_id).length + 1;
    const { data, error } = await supabase.from('products').insert({
      category_id: form.category_id,
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      image_url: form.image_url.trim() || null,
      is_available: true,
      sort_order: nextOrder,
    }).select().single();
    setSaving(false);
    if (error) { showToast('err', error.message); return; }
    if (data) setProducts(p => [...p, data as Product]);
    showToast('ok', `"${form.name.trim()}" agregado al menú`);
    setForm(f => ({ ...EMPTY, category_id: f.category_id }));
  }

  async function handleToggle(id: string, val: boolean) {
    const { error } = await supabase.from('products').update({ is_available: val }).eq('id', id);
    if (error) { showToast('err', error.message); return; }
    setProducts(p => p.map(x => x.id === id ? { ...x, is_available: val } : x));
  }

  async function handleDelete(id: string) {
    const prod = products.find(p => p.id === id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { showToast('err', error.message); return; }
    setProducts(p => p.filter(x => x.id !== id));
    showToast('ok', `"${prod?.name}" eliminado`);
  }

  const visibleProducts = filterCat === 'all'
    ? products
    : products.filter(p => p.category_id === filterCat);

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold transition-all ${
          toast.type === 'ok' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'ok'
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Add form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-orange-500" />
            Agregar Nuevo Plato
          </h2>
        </div>
        <form onSubmit={handleAdd} className="px-5 py-4 space-y-3">
          {/* Name */}
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Nombre del plato</label>
            <input
              required
              value={form.name}
              onChange={e => field('name', e.target.value)}
              placeholder="Ej: Churrasco a la parrilla"
              className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Descripción e ingredientes</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => field('description', e.target.value)}
              placeholder="Ej: Corte de res 300g, papas gratinadas, ensalada mixta y chimichurri"
              className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Price + Category row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Precio (USD)</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={e => field('price', e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Categoría</label>
              <div className="relative mt-1">
                <select
                  required
                  value={form.category_id}
                  onChange={e => field('category_id', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors appearance-none bg-white"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">URL de imagen (opcional)</label>
            <input
              type="url"
              value={form.image_url}
              onChange={e => field('image_url', e.target.value)}
              placeholder="https://images.pexels.com/..."
              className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !form.name.trim() || !form.price || !form.category_id}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm active:scale-[0.98] transition-all shadow-md shadow-orange-500/25 disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar Plato'}
          </button>
        </form>
      </div>

      {/* Product list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-gray-900">Catálogo actual</h2>
          <div className="relative">
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="pl-3 pr-7 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 focus:outline-none appearance-none bg-white"
            >
              <option value="all">Todas</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
          </div>
        </div>

        <div className="px-5">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-gray-300 animate-spin" /></div>
          ) : visibleProducts.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">No hay platos en esta categoría</p>
          ) : (
            visibleProducts.map(p => (
              <ProductRow key={p.id} product={p} onToggle={handleToggle} onDelete={handleDelete} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

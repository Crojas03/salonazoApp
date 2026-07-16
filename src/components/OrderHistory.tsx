import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Receipt, Loader2, Package, Clock, CheckCircle2, ChefHat, Bike, MapPin, Phone, AlertCircle } from 'lucide-react';
import { supabase, type OrderRow, STATUS_CONFIG } from '../lib/supabase';
import { useBcvRate } from '../hooks/useBcvRate';
import type { UserProfile } from '../hooks/useProfile';
type P = { profile: UserProfile | null; onBack: () => void; onAuthClick: () => void };
const iconMap: Record<string, typeof Clock> = { recibido: Receipt, preparando: ChefHat, listo_delivery: Package, en_camino: Bike, entregado: CheckCircle2, cancelado: AlertCircle };
function formatDate(iso: string) { try { const d = new Date(iso); return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }); } catch { return iso; } }
export function OrderHistory({ profile, onBack, onAuthClick }: P) {
  const [orders, setOrders] = useState<OrderRow[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const { rate } = useBcvRate();
  const fetchOrders = useCallback(async () => {
    if (!profile?.phone) { setLoading(false); return; }
    setLoading(true); setError('');
    try { const { data, error: e } = await supabase.from('orders').select('*').eq('customer_phone', profile.phone).order('created_at', { ascending: false }); if (e) throw e; setOrders((data ?? []) as OrderRow[]); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  }, [profile?.phone]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  if (!profile) return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-white"><div className="px-4 py-3.5 flex items-center gap-3 border-b border-gray-50"><button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center active:scale-90"><ArrowLeft className="w-5 h-5 text-gray-600" /></button><h2 className="text-lg font-bold text-gray-900 flex-1">Mis Pedidos</h2></div><div className="flex-1 flex flex-col items-center justify-center px-8 text-center"><div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4"><Receipt className="w-8 h-8 text-gray-300" /></div><h3 className="text-lg font-bold text-gray-900 mb-2">Inicia sesión</h3><button onClick={onAuthClick} className="px-6 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm">Iniciar Sesión</button></div></div>
  );
  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-white"><div className="px-4 py-3.5 flex items-center gap-3 border-b border-gray-50"><button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center active:scale-90"><ArrowLeft className="w-5 h-5 text-gray-600" /></button><h2 className="text-lg font-bold text-gray-900 flex-1">Mis Pedidos</h2><button onClick={fetchOrders} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center active:scale-90"><Clock className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} /></button></div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? <div className="flex flex-col items-center justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
        : error ? <div className="flex flex-col items-center justify-center py-20"><AlertCircle className="w-12 h-12 text-red-400 mb-3" /><p className="text-sm text-gray-400">{error}</p><button onClick={fetchOrders} className="mt-4 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold">Reintentar</button></div>
        : orders.length === 0 ? <div className="flex flex-col items-center justify-center py-20"><div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4"><Package className="w-8 h-8 text-gray-300" /></div><p className="text-gray-400 font-medium">No tienes pedidos</p><button onClick={onBack} className="mt-6 px-6 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm">Hacer pedido</button></div>
        : orders.map(o => { const sc = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.recibido; const Icon = iconMap[o.status] ?? Clock; const items = Array.isArray(o.items) ? o.items : []; return (
          <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><div className={`flex items-center justify-between px-4 py-3 ${sc.bg}`}><div className="flex items-center gap-2"><Icon className={`w-4 h-4 ${sc.color}`} /><span className={`text-sm font-bold ${sc.color}`}>{sc.label}</span></div><span className="text-[10px] text-gray-400">{formatDate(o.created_at)}</span></div><div className="px-4 py-3 space-y-1.5">{items.map((it, i) => <div key={i} className="flex justify-between text-xs"><span className="text-gray-500">{it.quantity}x {it.name}</span><span className="font-semibold text-gray-600">${(Number(it.price) * it.quantity).toFixed(2)}</span></div>)}</div><div className="px-4 py-3 border-t border-gray-50 space-y-1.5"><div className="flex items-start gap-2 text-xs text-gray-400"><MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{o.delivery_address}</span></div><div className="flex items-center gap-2 text-xs text-gray-400"><Phone className="w-3.5 h-3.5" /><span>{o.payment_method}</span></div><div className="flex justify-between pt-1.5 border-t border-gray-50"><span className="text-xs font-bold text-gray-500">Total</span><div className="text-right"><span className="font-black text-orange-500 text-base">${Number(o.total).toFixed(2)}</span><p className="text-[10px] text-gray-400">Bs. {(Number(o.total) * rate).toFixed(2)}</p></div></div></div></div>
        ); })}
      </div>
    </div>
  );
}

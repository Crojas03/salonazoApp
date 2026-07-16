import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Bike, Loader2, Radio, Phone, MapPin, Clock, Package, CheckCircle2, Navigation, X } from 'lucide-react';
import { supabase, type OrderRow, STATUS_CONFIG } from '../lib/supabase';
import type { UserProfile } from '../hooks/useProfile';
import type { StaffRole } from '../lib/supabase';

type P = { profile: UserProfile; onBack: () => void; staffRoles: StaffRole[] };

export function DeliveryPanel({ profile, onBack, staffRoles }: P) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeOk, setRealtimeOk] = useState(false);
  const [advancing, setAdvancing] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('orders').select('*').in('status', ['listo_delivery', 'en_camino']).order('created_at', { ascending: true });
      if (error) throw error;
      setOrders((data ?? []) as OrderRow[]);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    const channel = supabase.channel('delivery-orders-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
      const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as OrderRow;
      const visibleStatuses = ['listo_delivery', 'en_camino'];
      if (payload.eventType === 'INSERT') {
        if (visibleStatuses.includes(row.status)) setOrders(prev => prev.some(o => o.id === row.id) ? prev : [...prev, row]);
      } else if (payload.eventType === 'UPDATE') {
        setOrders(prev => {
          if (visibleStatuses.includes(row.status)) return prev.some(o => o.id === row.id) ? prev.map(o => o.id === row.id ? row : o) : [...prev, row];
          return prev.filter(o => o.id !== row.id);
        });
      } else if (payload.eventType === 'DELETE') {
        setOrders(prev => prev.filter(o => o.id !== row.id));
      }
    }).subscribe((status) => setRealtimeOk(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const startTrip = async (id: string) => { setAdvancing(id); try { await supabase.from('orders').update({ status: 'en_camino' }).eq('id', id); } finally { setAdvancing(null); } };
  const markDelivered = async (id: string) => { setAdvancing(id); try { await supabase.from('orders').update({ status: 'entregado' }).eq('id', id); } finally { setAdvancing(null); } };

  const listoOrders = orders.filter(o => o.status === 'listo_delivery');
  const enCaminoOrders = orders.filter(o => o.status === 'en_camino');

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3.5 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center active:scale-90"><ArrowLeft className="w-5 h-5 text-gray-400" /></button>
        <div className="flex-1"><h1 className="text-lg font-bold">Repartidor</h1><p className="text-[10px] text-gray-500">{profile.name}</p></div>
        <div className="flex items-center gap-1.5"><Radio className={`w-4 h-4 ${realtimeOk ? 'text-green-400 animate-pulse' : 'text-gray-600'}`} /><span className="text-[10px] font-bold text-gray-500">{realtimeOk ? 'Live' : '...'}</span></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
        : (<>
          <div>
            <div className="flex items-center gap-2 mb-2"><Package className="w-4 h-4 text-emerald-400" /><h3 className="text-sm font-bold text-white">Listos para Entrega</h3><span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{listoOrders.length}</span></div>
            <div className="space-y-3">
              {listoOrders.length === 0 ? <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center text-gray-600 text-sm">Sin pedidos listos</div>
              : listoOrders.map(o => <DeliveryCard key={o.id} order={o} advancing={advancing === o.id} actionLabel="Iniciar Viaje" actionIcon={Navigation} onAction={() => startTrip(o.id)} />)}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2"><Bike className="w-4 h-4 text-purple-400" /><h3 className="text-sm font-bold text-white">En Camino</h3><span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{enCaminoOrders.length}</span></div>
            <div className="space-y-3">
              {enCaminoOrders.length === 0 ? <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center text-gray-600 text-sm">Sin viajes activos</div>
              : enCaminoOrders.map(o => <DeliveryCard key={o.id} order={o} advancing={advancing === o.id} actionLabel="Marcar Entregado" actionIcon={CheckCircle2} onAction={() => markDelivered(o.id)} />)}
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}

function DeliveryCard({ order, advancing, actionLabel, actionIcon: ActionIcon, onAction }: { order: OrderRow; advancing: boolean; actionLabel: string; actionIcon: typeof Navigation; onAction: () => void }) {
  const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.recibido;
  const items = Array.isArray(order.items) ? order.items : [];
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-2.5 ${sc.bg} bg-opacity-10`}>
        <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${sc.dot}`} /><span className="text-sm font-bold">{sc.label}</span></div>
        <span className="text-[10px] text-gray-500">{new Date(order.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold"><Phone className="w-3.5 h-3.5 text-gray-500" />{order.customer_name} · {order.customer_phone}</div>
        <div className="flex items-start gap-2 text-xs text-gray-400"><MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{order.delivery_address}{order.delivery_zone && <span className="ml-1 px-1.5 py-0.5 rounded bg-gray-800 text-[10px]">{order.delivery_zone}</span>}</div>
        <div className="space-y-1 pt-1">{items.map((it, i) => <div key={i} className="flex justify-between text-xs"><span className="text-gray-400">{it.quantity}x {it.name}</span><span className="text-gray-500">${(Number(it.price) * it.quantity).toFixed(2)}</span></div>)}</div>
        {order.notas && <div className="bg-amber-950/40 border border-amber-900/50 rounded-lg px-2.5 py-1.5 text-xs text-amber-400">{order.notas}</div>}
        <div className="flex justify-between pt-2 border-t border-gray-800"><span className="text-xs text-gray-500">{order.payment_method}</span><span className="font-black text-orange-400">${Number(order.total).toFixed(2)}</span></div>
      </div>
      <div className="px-4 pb-3">
        <button onClick={onAction} disabled={advancing} className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5">{advancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ActionIcon className="w-3.5 h-3.5" />}{actionLabel}</button>
      </div>
    </div>
  );
}

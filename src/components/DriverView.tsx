import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  PackageCheck,
  Phone,
  MapPin,
  User,
  Hash,
  CheckCircle2,
  Loader2,
  AlertCircle,
  History,
  Bike,
  MessageCircle,
  LogOut,
} from 'lucide-react';
import { supabase, type Order } from '../lib/supabase';

type Tab = 'pendientes' | 'historial';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function DriverOrderCard({
  order,
  onInTransit,
  onDeliver,
}: {
  order: Order;
  onInTransit: (id: string) => void;
  onDeliver: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const phoneDigits = order.customer_phone.replace(/\D/g, '');
  const localPhone = phoneDigits.startsWith('58') ? phoneDigits.slice(2) : phoneDigits;
  const isInTransit = order.status === 'en_camino';

  const handleAction = async (fn: (id: string) => void | Promise<void>) => {
    setBusy(true);
    try { await fn(order.id); } catch { /* error shown by parent */ } finally { setBusy(false); }
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
      isInTransit ? 'border-orange-200 shadow-orange-100' : 'border-gray-100'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        isInTransit ? 'bg-orange-50 border-orange-100' : 'border-gray-50'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            isInTransit ? 'bg-orange-100' : 'bg-green-50'
          }`}>
            {isInTransit
              ? <Bike className="w-4 h-4 text-orange-500" />
              : <Hash className="w-4 h-4 text-green-500" />
            }
          </div>
          <div>
            <p className="font-mono font-bold text-sm text-gray-900">#{shortId(order.id)}</p>
            <p className="text-[11px] text-gray-400">{formatTime(order.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isInTransit && (
            <span className="text-[11px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full animate-pulse">
              En Camino
            </span>
          )}
          <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
            {order.delivery_zone}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-gray-300 flex-shrink-0" />
          <span className="font-semibold text-gray-900">{order.customer_name}</span>
        </div>
        <div className="flex items-start gap-2 text-xs">
          <MapPin className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
          <span className="text-gray-600 leading-relaxed">{order.delivery_address}</span>
        </div>
        <div className="flex gap-2 pt-1">
          <a
            href={`tel:${phoneDigits}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all"
          >
            <Phone className="w-4 h-4 text-gray-600" />
            <span className="text-xs font-bold text-gray-700">Llamar</span>
          </a>
          <a
            href={`https://wa.me/58${localPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-50 hover:bg-green-100 active:scale-95 transition-all"
          >
            <MessageCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold text-green-700">WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        {!isInTransit && (
          <button
            onClick={() => handleAction(onInTransit)}
            disabled={busy}
            className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm active:scale-[0.98] transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Bike className="w-4 h-4" />En Camino</>}
          </button>
        )}
        <button
          onClick={() => handleAction(onDeliver)}
          disabled={busy}
          className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm active:scale-[0.98] transition-all shadow-md shadow-green-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" />Entregado</>}
        </button>
      </div>
    </div>
  );
}

function HistoryCard({ order }: { order: Order }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-gray-400" />
        </div>
        <div className="min-w-0">
          <p className="font-mono font-bold text-xs text-gray-900">
            #{shortId(order.id)}
          </p>
          <p className="text-[11px] text-gray-400 truncate">
            {order.customer_name} · {order.delivery_zone}
          </p>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        <p className="font-bold text-sm text-gray-900">${order.total.toFixed(2)}</p>
        <p className="text-[11px] text-gray-400">{formatTime(order.created_at)}</p>
      </div>
    </div>
  );
}

export function DriverView({ onExit, onLogout }: { onExit: () => void; onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('pendientes');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function fetchOrders() {
      try {
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .in('status', ['listo_despacho', 'en_camino', 'entregado'])
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setOrders((data ?? []) as Order[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar pedidos');
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();

    channel = supabase
      .channel('driver-orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order;
          if (['listo_despacho', 'en_camino', 'entregado'].includes(newOrder.status)) {
            setOrders((prev) =>
              prev.some((o) => o.id === newOrder.id) ? prev : [newOrder, ...prev]
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new as Order;
          setOrders((prev) => {
            const exists = prev.some((o) => o.id === updated.id);
            if (['listo_despacho', 'en_camino', 'entregado'].includes(updated.status)) {
              return exists
                ? prev.map((o) => (o.id === updated.id ? updated : o))
                : [updated, ...prev];
            }
            return exists ? prev.map((o) => (o.id === updated.id ? updated : o)) : prev;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload) => {
          const deleted = payload.old as Order;
          setOrders((prev) => prev.filter((o) => o.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const pendientes = useMemo(
    () => orders.filter((o) => o.status === 'listo_despacho' || o.status === 'en_camino'),
    [orders]
  );
  const entregados = useMemo(
    () => orders.filter((o) => o.status === 'entregado'),
    [orders]
  );

  const totalEntregado = entregados.reduce((sum, o) => sum + o.total, 0);

  const updateDriverStatus = async (orderId: string, status: 'en_camino' | 'entregado') => {
    setActionError(null);
    // Optimistic: move card instantly, Realtime will confirm
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (updateError) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['listo_despacho', 'en_camino', 'entregado'])
        .order('created_at', { ascending: false });
      if (data) setOrders(data as Order[]);
      setActionError(updateError.message);
    }
  };

  const handleInTransit = (orderId: string) => updateDriverStatus(orderId, 'en_camino');
  const handleDeliver = (orderId: string) => updateDriverStatus(orderId, 'entregado');

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center active:scale-90 transition-all"
              aria-label="Salir"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight tracking-tight">
                Vista Motorizado
              </h1>
              <p className="text-[11px] text-gray-400 font-medium leading-tight">
                Entregas pendientes y historial
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Bike className="w-5 h-5 text-green-500" />
            </div>
            <button
              onClick={onLogout}
              className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center active:scale-95 transition-all"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1">
          <button
            onClick={() => setActiveTab('pendientes')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'pendientes'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            Pendientes
            {pendientes.length > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-green-500 text-white">
                {pendientes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'historial'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <History className="w-4 h-4" />
            Historial
            {entregados.length > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-gray-200 text-gray-600">
                {entregados.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="px-4 py-4 space-y-3">
        {actionError && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
            <p className="text-sm text-gray-400 mt-3">Cargando pedidos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
            <p className="text-sm font-bold text-gray-900 mb-1">Error</p>
            <p className="text-xs text-gray-400">{error}</p>
          </div>
        ) : activeTab === 'pendientes' ? (
          pendientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <PackageCheck className="w-7 h-7 text-gray-200" />
              </div>
              <p className="text-sm text-gray-400 font-medium">
                No hay pedidos listos para entrega
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Los pedidos aparecerán aquí cuando estén listos
              </p>
            </div>
          ) : (
            pendientes.map((order) => (
              <DriverOrderCard
                key={order.id}
                order={order}
                onInTransit={handleInTransit}
                onDeliver={handleDeliver}
              />
            ))
          )
        ) : entregados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <History className="w-7 h-7 text-gray-200" />
            </div>
            <p className="text-sm text-gray-400 font-medium">
              No hay entregas registradas hoy
            </p>
          </div>
        ) : (
          <>
            {/* Cash summary */}
            <div className="bg-gray-900 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
                  Total entregado
                </p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  ${totalEntregado.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
                  Entregas
                </p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  {entregados.length}
                </p>
              </div>
            </div>

            {/* History list */}
            {entregados.map((order) => (
              <HistoryCard key={order.id} order={order} />
            ))}
          </>
        )}
      </main>
    </div>
  );
}

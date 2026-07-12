import { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Truck, Clock, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase, type Order } from '../lib/supabase';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
}

function StatCard({
  label, value, sub, Icon, color,
}: {
  label: string;
  value: string;
  sub?: string;
  Icon: typeof DollarSign;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900 leading-tight">{value}</p>
        <p className="text-xs font-semibold text-gray-400 mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-gray-300 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function SalesReport() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'entregado')
      .order('created_at', { ascending: false });
    if (err) { setError(err.message); }
    else { setOrders((data ?? []) as Order[]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Filter today's orders
  const todayStr = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === todayStr);

  const totalBilled = orders.reduce((s, o) => s + Number(o.total), 0);
  const todayCount = todayOrders.length;
  const totalDelivery = orders.reduce((s, o) => s + Number(o.delivery_fee), 0);

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700">Cierre de Caja</h2>
        <button
          onClick={load}
          disabled={loading}
          className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
          aria-label="Actualizar"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="space-y-3">
        <StatCard
          label="Total Facturado (entregados)"
          value={`$${totalBilled.toFixed(2)}`}
          sub={`${orders.length} pedido${orders.length !== 1 ? 's' : ''} en total`}
          Icon={DollarSign}
          color="bg-green-500"
        />
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Pedidos Hoy"
            value={String(todayCount)}
            sub={`$${todayOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2)} hoy`}
            Icon={ShoppingBag}
            color="bg-blue-500"
          />
          <StatCard
            label="Delivery Acumulado"
            value={`$${totalDelivery.toFixed(2)}`}
            sub={`${orders.length} envío${orders.length !== 1 ? 's' : ''}`}
            Icon={Truck}
            color="bg-orange-500"
          />
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-bold text-gray-900">Historial de pedidos entregados</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-10 gap-2">
            <AlertCircle className="w-8 h-8 text-red-300" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2">
            <ShoppingBag className="w-10 h-10 text-gray-100" />
            <p className="text-sm text-gray-400">No hay pedidos entregados aún</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70">
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">Fecha / Hora</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">Referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-700 text-xs">{formatTime(order.created_at)}</p>
                          <p className="text-[11px] text-gray-400">{formatDate(order.created_at)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 truncate max-w-[120px]">{order.customer_name}</p>
                      <p className="text-[11px] text-gray-400">{order.delivery_zone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-gray-900">${Number(order.total).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-gray-600 select-all">
                        {order.payment_reference || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

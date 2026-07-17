import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, ChefHat, BarChart3, TrendingUp, UtensilsCrossed, Bell, Loader2, Radio, Phone, MapPin, Clock, X, Check, ChevronRight, Plus, Pencil, Trash2, Pause, Play, Star, Tag, DollarSign, ShoppingBag, Calendar, Filter, AlertCircle, Save, BadgePercent, RefreshCw, AlertTriangle, Lock } from 'lucide-react';
import { supabase, type OrderRow, type Product, type Category, type NotificationTemplate, STATUS_FLOW, STATUS_CONFIG, KITCHEN_ADVANCE_LABEL } from '../lib/supabase';
import type { UserProfile } from '../hooks/useProfile';
import type { StaffRole } from '../lib/supabase';
import { useBcvRate } from '../hooks/useBcvRate';

type Tab = 'pedidos' | 'tasa' | 'reportes' | 'bestsellers' | 'menu' | 'notificaciones';

type P = { profile: UserProfile; onBack: () => void; staffRoles: StaffRole[] };

export function AdminDashboard({ profile, onBack, staffRoles }: P) {
  const [tab, setTab] = useState<Tab>('pedidos');
  const isAdmin = staffRoles.includes('admin');
  const tabs: { id: Tab; label: string; Icon: typeof ChefHat; adminOnly?: boolean }[] = [
    { id: 'pedidos', label: 'Pedidos', Icon: ChefHat },
    { id: 'tasa', label: 'Tasa BCV', Icon: BadgePercent, adminOnly: true },
    { id: 'reportes', label: 'Reportes', Icon: BarChart3, adminOnly: true },
    { id: 'bestsellers', label: 'Best-Sellers', Icon: TrendingUp, adminOnly: true },
    { id: 'menu', label: 'Menú', Icon: UtensilsCrossed, adminOnly: true },
    { id: 'notificaciones', label: 'Notif.', Icon: Bell, adminOnly: true },
  ];
  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3.5 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center active:scale-90"><ArrowLeft className="w-5 h-5 text-gray-400" /></button>
        <div className="flex-1"><h1 className="text-lg font-bold">Modo Operador</h1><p className="text-[10px] text-gray-500">{isAdmin ? 'Administrador' : 'Cocina'} · {profile.name}</p></div>
        <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center font-black text-sm">{profile.name?.charAt(0)?.toUpperCase() ?? '?'}</div>
      </div>
      <div className="bg-gray-900 border-b border-gray-800 flex gap-1 px-2 overflow-x-auto scrollbar-none">
        {visibleTabs.map(({ id, label, Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${tab === id ? 'border-orange-500 text-white' : 'border-transparent text-gray-500'}`}><Icon className="w-3.5 h-3.5" />{label}</button>)}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'pedidos' && <PedidosTab />}
        {tab === 'tasa' && <TasaBcvTab profile={profile} />}
        {tab === 'reportes' && <ReportesTab />}
        {tab === 'bestsellers' && <BestSellersTab />}
        {tab === 'menu' && <MenuTab />}
        {tab === 'notificaciones' && <NotificacionesTab />}
      </div>
    </div>
  );
}

function PedidosTab() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeOk, setRealtimeOk] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [advancing, setAdvancing] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      setOrders((data ?? []) as OrderRow[]);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    const channel = supabase.channel('admin-orders-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
      if (payload.eventType === 'INSERT') setOrders(prev => [payload.new as OrderRow, ...prev]);
      else if (payload.eventType === 'UPDATE') setOrders(prev => prev.map(o => o.id === (payload.new as OrderRow).id ? payload.new as OrderRow : o));
      else if (payload.eventType === 'DELETE') setOrders(prev => prev.filter(o => o.id !== (payload.old as OrderRow).id));
    }).subscribe((status) => setRealtimeOk(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const advance = async (id: string, current: string) => {
    const idx = STATUS_FLOW.indexOf(current as typeof STATUS_FLOW[number]);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1];
    setAdvancing(id);
    try { await supabase.from('orders').update({ status: next }).eq('id', id); }
    finally { setAdvancing(null); }
  };

  const cancel = async (id: string) => { await supabase.from('orders').update({ status: 'cancelado' }).eq('id', id); };

  const filtered = filter === 'all' ? orders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado') : orders.filter(o => o.status === filter);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Radio className={`w-4 h-4 ${realtimeOk ? 'text-green-400 animate-pulse' : 'text-gray-600'}`} /><span className="text-xs font-bold text-gray-400">{realtimeOk ? 'En vivo' : 'Conectando...'}</span></div>
        <button onClick={fetchOrders} className="text-xs text-gray-500 font-bold">Actualizar</button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filter === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'}`}>Activos</button>
        {STATUS_FLOW.map(s => <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filter === s ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'}`}>{STATUS_CONFIG[s].label}</button>)}
        <button onClick={() => setFilter('cancelado')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filter === 'cancelado' ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400'}`}>Cancelados</button>
      </div>
      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
      : filtered.length === 0 ? <div className="flex flex-col items-center py-20 text-gray-600"><ShoppingBag className="w-12 h-12 mb-3 opacity-30" /><p className="text-sm font-bold">Sin pedidos</p></div>
      : filtered.map(o => { const sc = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.recibido; const idx = STATUS_FLOW.indexOf(o.status as typeof STATUS_FLOW[number]); const canAdvance = idx >= 0 && idx < STATUS_FLOW.length - 1; const items = Array.isArray(o.items) ? o.items : []; return (
        <div key={o.id} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
            <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${sc.dot}`} /><span className="text-sm font-bold">{sc.label}</span></div>
            <span className="text-[10px] text-gray-500">{new Date(o.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold"><Phone className="w-3.5 h-3.5 text-gray-500" />{o.customer_name} · {o.customer_phone}</div>
            <div className="flex items-start gap-2 text-xs text-gray-400"><MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{o.delivery_address}{o.delivery_zone && <span className="ml-1 px-1.5 py-0.5 rounded bg-gray-800 text-[10px]">{o.delivery_zone}</span>}</div>
            <div className="space-y-1 pt-1">{items.map((it, i) => <div key={i} className="flex justify-between text-xs"><span className="text-gray-400">{it.quantity}x {it.name}</span><span className="text-gray-500">${(Number(it.price) * it.quantity).toFixed(2)}</span></div>)}</div>
            {o.notas && <div className="bg-amber-950/40 border border-amber-900/50 rounded-lg px-2.5 py-1.5 text-xs text-amber-400">{o.notas}</div>}
            <div className="flex justify-between pt-2 border-t border-gray-800"><span className="text-xs text-gray-500">{o.payment_method}</span><span className="font-black text-orange-400">${Number(o.total).toFixed(2)}</span></div>
          </div>
          <div className="px-4 pb-3 flex gap-2">
            {canAdvance && <button onClick={() => advance(o.id, o.status)} disabled={advancing === o.id} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5">{advancing === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}{KITCHEN_ADVANCE_LABEL[o.status] ?? 'Avanzar'}</button>}
            {o.status !== 'entregado' && o.status !== 'cancelado' && <button onClick={() => cancel(o.id)} className="px-3 py-2.5 rounded-xl bg-gray-800 hover:bg-red-900/50 text-red-400 text-xs font-bold active:scale-[0.98]">Cancelar</button>}
          </div>
        </div>
      ); })}
    </div>
  );
}

type SalesRow = { id: string; created_at: string; customer_name: string; customer_phone: string; total: number; delivery_fee: number; payment_method: string; status: string; delivery_zone: string | null; items: { product_id: string; name: string; price: number; quantity: number }[] };

function ReportesTab() {
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [driverFilter, setDriverFilter] = useState('all');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('orders').select('*').gte('created_at', `${from}T00:00:00`).lte('created_at', `${to}T23:59:59`).order('created_at', { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as SalesRow[]);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const delivered = useMemo(() => rows.filter(r => r.status === 'entregado'), [rows]);
  const grossRevenue = useMemo(() => delivered.reduce((s, r) => s + Number(r.total), 0), [delivered]);
  const totalDeliveryFees = useMemo(() => delivered.reduce((s, r) => s + Number(r.delivery_fee), 0), [delivered]);
  const netEarnings = grossRevenue - totalDeliveryFees;
  const orderCount = delivered.length;
  const avgTicket = orderCount > 0 ? grossRevenue / orderCount : 0;

  const drivers = useMemo(() => Array.from(new Set(delivered.map(r => r.delivery_zone).filter(Boolean))) as string[], [delivered]);
  const filteredDelivered = driverFilter === 'all' ? delivered : delivered.filter(r => r.delivery_zone === driverFilter);

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
        <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase"><Filter className="w-3.5 h-3.5" /> Filtros</div>
        <div className="flex gap-2">
          <div className="flex-1"><label className="text-[10px] text-gray-500 font-bold">Desde</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
          <div className="flex-1"><label className="text-[10px] text-gray-500 font-bold">Hasta</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
        </div>
        {drivers.length > 0 && <div><label className="text-[10px] text-gray-500 font-bold">Zona/Driver</label><select value={driverFilter} onChange={e => setDriverFilter(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-orange-500"><option value="all">Todas</option>{drivers.map(d => <option key={d} value={d}>{d}</option>)}</select></div>}
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
      : (<>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-green-900/40 to-gray-900 rounded-2xl border border-green-800/50 p-4"><div className="flex items-center gap-2 text-green-400 text-xs font-bold mb-1"><DollarSign className="w-3.5 h-3.5" /> Ingresos</div><p className="text-2xl font-black text-white">${grossRevenue.toFixed(2)}</p><p className="text-[10px] text-gray-500 mt-0.5">Bs. {(grossRevenue * 145.5).toFixed(0)}</p></div>
          <div className="bg-gradient-to-br from-blue-900/40 to-gray-900 rounded-2xl border border-blue-800/50 p-4"><div className="flex items-center gap-2 text-blue-400 text-xs font-bold mb-1"><TrendingUp className="w-3.5 h-3.5" /> Neto</div><p className="text-2xl font-black text-white">${netEarnings.toFixed(2)}</p><p className="text-[10px] text-gray-500 mt-0.5">Sin envío</p></div>
          <div className="bg-gradient-to-br from-orange-900/40 to-gray-900 rounded-2xl border border-orange-800/50 p-4"><div className="flex items-center gap-2 text-orange-400 text-xs font-bold mb-1"><ShoppingBag className="w-3.5 h-3.5" /> Pedidos</div><p className="text-2xl font-black text-white">{orderCount}</p><p className="text-[10px] text-gray-500 mt-0.5">Entregados</p></div>
          <div className="bg-gradient-to-br from-purple-900/40 to-gray-900 rounded-2xl border border-purple-800/50 p-4"><div className="flex items-center gap-2 text-purple-400 text-xs font-bold mb-1"><Calendar className="w-3.5 h-3.5" /> Ticket</div><p className="text-2xl font-black text-white">${avgTicket.toFixed(2)}</p><p className="text-[10px] text-gray-500 mt-0.5">Promedio</p></div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800"><h3 className="text-sm font-bold text-white">Historial de Ventas</h3></div>
          <div className="divide-y divide-gray-800">
            {filteredDelivered.length === 0 ? <div className="px-4 py-8 text-center text-gray-600 text-sm">Sin ventas en este rango</div>
            : filteredDelivered.slice(0, 50).map(r => <div key={r.id} className="px-4 py-3 flex items-center justify-between"><div><p className="text-sm font-bold text-white">{r.customer_name}</p><p className="text-[10px] text-gray-500">{new Date(r.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })} · {r.payment_method}{r.delivery_zone ? ` · ${r.delivery_zone}` : ''}</p></div><span className="font-black text-orange-400 text-sm">${Number(r.total).toFixed(2)}</span></div>)}
          </div>
        </div>
      </>)}
    </div>
  );
}

function BestSellersTab() {
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('orders').select('items, status').eq('status', 'entregado');
        if (error) throw error;
        setRows((data ?? []) as SalesRow[]);
      } catch { setRows([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const stats = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const r of rows) {
      const items = Array.isArray(r.items) ? r.items : [];
      for (const it of items) {
        const existing = map.get(it.product_id) ?? { name: it.name, qty: 0, revenue: 0 };
        existing.qty += it.quantity;
        existing.revenue += Number(it.price) * it.quantity;
        map.set(it.product_id, existing);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [rows]);

  const maxQty = stats.length > 0 ? stats[0].qty : 1;

  return (
    <div className="p-4 space-y-3">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 px-4 py-3"><h3 className="text-sm font-bold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-400" /> Best-Sellers</h3><p className="text-[10px] text-gray-500 mt-0.5">Basado en pedidos entregados</p></div>
      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
      : stats.length === 0 ? <div className="flex flex-col items-center py-20 text-gray-600"><BarChart3 className="w-12 h-12 mb-3 opacity-30" /><p className="text-sm font-bold">Sin datos</p></div>
      : stats.map((s, i) => (
        <div key={i} className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${i < 3 ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-500'}`}>{i + 1}</div>
              <span className="text-sm font-bold text-white">{s.name}</span>
            </div>
            <div className="text-right"><span className="font-black text-orange-400 text-sm">{s.qty}x</span><p className="text-[10px] text-gray-500">${s.revenue.toFixed(2)}</p></div>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all" style={{ width: `${(s.qty / maxQty) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function MenuTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: prods, error: e1 }, { data: cats, error: e2 }] = await Promise.all([
        supabase.from('products').select('*').order('sort_order', { ascending: true }),
        supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      ]);
      if (e1 || e2) throw e1 ?? e2;
      setProducts((prods ?? []) as Product[]);
      setCategories((cats ?? []) as Category[]);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchProducts();
    const channel = supabase.channel('admin-products-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
      if (payload.eventType === 'INSERT') setProducts(prev => [...prev, payload.new as Product]);
      else if (payload.eventType === 'UPDATE') setProducts(prev => prev.map(p => p.id === (payload.new as Product).id ? payload.new as Product : p));
      else if (payload.eventType === 'DELETE') setProducts(prev => prev.filter(p => p.id !== (payload.old as Product).id));
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchProducts]);

  const toggleAvailable = async (p: Product) => { await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id); };
  const toggleBadge = async (p: Product) => { const newBadge = p.badge === 'bestseller' ? null : 'bestseller'; await supabase.from('products').update({ badge: newBadge }).eq('id', p.id); };
  const toggleOferta = async (p: Product) => { if (p.original_price != null && Number(p.original_price) > Number(p.price)) { await supabase.from('products').update({ original_price: null, badge: null }).eq('id', p.id); } else { await supabase.from('products').update({ original_price: Number(p.price) * 1.25, badge: 'oferta' }).eq('id', p.id); } };
  const deleteProduct = async (id: string) => { if (confirm('¿Eliminar este producto?')) { await supabase.from('products').delete().eq('id', id); } };

  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? '?';

  return (
    <div className="p-4 space-y-3">
      <button onClick={() => setCreating(true)} className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Nuevo Producto</button>
      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
      : products.map(p => {
        const hasDiscount = p.original_price != null && Number(p.original_price) > Number(p.price);
        return (
          <div key={p.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-3 flex gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-800">{p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🍽</div>}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2"><h4 className="text-sm font-bold text-white truncate">{p.name}</h4><span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{catName(p.category_id)}</span></div>
              <div className="flex items-center gap-2 mt-0.5"><span className="font-black text-orange-400 text-sm">${Number(p.price).toFixed(2)}</span>{hasDiscount && <span className="text-xs text-gray-600 line-through">${Number(p.original_price).toFixed(2)}</span>}</div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button onClick={() => toggleAvailable(p)} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${p.is_available ? 'bg-green-900/40 text-green-400 border border-green-800/50' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>{p.is_available ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}{p.is_available ? 'Activo' : 'Pausado'}</button>
                <button onClick={() => toggleBadge(p)} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${p.badge === 'bestseller' ? 'bg-orange-900/40 text-orange-400 border border-orange-800/50' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}><Star className="w-2.5 h-2.5" />TOP</button>
                <button onClick={() => toggleOferta(p)} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${hasDiscount ? 'bg-red-900/40 text-red-400 border border-red-800/50' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}><Tag className="w-2.5 h-2.5" />Oferta</button>
                <button onClick={() => setEditing(p)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-gray-800 text-blue-400 border border-gray-700 flex items-center gap-1"><Pencil className="w-2.5 h-2.5" />Editar</button>
                <button onClick={() => deleteProduct(p.id)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-gray-800 text-red-400 border border-gray-700 flex items-center gap-1"><Trash2 className="w-2.5 h-2.5" /></button>
              </div>
            </div>
          </div>
        );
      })}
      {(editing || creating) && <ProductEditor product={editing} categories={categories} onClose={() => { setEditing(null); setCreating(false); }} onSaved={() => { setEditing(null); setCreating(false); fetchProducts(); }} saving={saving} setSaving={setSaving} />}
    </div>
  );
}

function ProductEditor({ product, categories, onClose, onSaved, saving, setSaving }: { product: Product | null; categories: Category[]; onClose: () => void; onSaved: () => void; saving: boolean; setSaving: (b: boolean) => void }) {
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [originalPrice, setOriginalPrice] = useState(product?.original_price ? String(product.original_price) : '');
  const [image_url, setImageUrl] = useState(product?.image_url ?? '');
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? '');
  const [isAvailable, setIsAvailable] = useState(product?.is_available ?? true);
  const [badge, setBadge] = useState(product?.badge ?? null);
  const [sortOrder, setSortOrder] = useState(product ? String(product.sort_order) : '0');
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (!name.trim() || !price.trim() || !categoryId) { setError('Completa nombre, precio y categoría'); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim() || null, price: Number(price), original_price: originalPrice ? Number(originalPrice) : null, image_url: image_url.trim() || null, category_id: categoryId, is_available: isAvailable, badge, sort_order: Number(sortOrder) || 0 };
      if (product) { const { error: e } = await supabase.from('products').update(payload).eq('id', product.id); if (e) throw e; }
      else { const { error: e } = await supabase.from('products').insert(payload); if (e) throw e; }
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-gray-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-gray-800 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-800 sticky top-0 bg-gray-900 z-10"><h3 className="text-base font-bold text-white">{product ? 'Editar' : 'Nuevo'} Producto</h3><button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center"><X className="w-5 h-5 text-gray-400" /></button></div>
        <div className="p-5 space-y-4">
          <div><label className="text-xs font-bold text-gray-400 mb-1.5 block">Nombre</label><input value={name} onChange={e => setName(e.target.value)} className="w-full px-3.5 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
          <div><label className="text-xs font-bold text-gray-400 mb-1.5 block">Descripción</label><textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3.5 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-orange-500 resize-none" /></div>
          <div className="flex gap-2">
            <div className="flex-1"><label className="text-xs font-bold text-gray-400 mb-1.5 block">Precio $</label><input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-3.5 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
            <div className="flex-1"><label className="text-xs font-bold text-gray-400 mb-1.5 block">Precio orig.</label><input type="number" step="0.01" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} className="w-full px-3.5 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
          </div>
          <div><label className="text-xs font-bold text-gray-400 mb-1.5 block">Categoría</label><select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-3.5 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-orange-500">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="text-xs font-bold text-gray-400 mb-1.5 block">URL Imagen</label><input value={image_url} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="w-full px-3.5 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
          <div className="flex gap-2">
            <div className="flex-1"><label className="text-xs font-bold text-gray-400 mb-1.5 block">Orden</label><input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full px-3.5 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
            <div className="flex-1"><label className="text-xs font-bold text-gray-400 mb-1.5 block">Badge</label><select value={badge ?? ''} onChange={e => setBadge(e.target.value || null)} className="w-full px-3.5 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-orange-500"><option value="">Ninguno</option><option value="bestseller">Bestseller</option><option value="oferta">Oferta</option><option value="nuevo">Nuevo</option></select></div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} className="w-4 h-4 accent-orange-500" /><span className="text-sm font-bold text-white">Disponible</span></label>
          {error && <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-400" /><p className="text-xs text-red-400">{error}</p></div>}
          <button onClick={save} disabled={saving} className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Guardar</>}</button>
        </div>
      </div>
    </div>
  );
}

function NotificacionesTab() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('notification_templates').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setTemplates((data ?? []) as NotificationTemplate[]);
    } catch { setTemplates([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchTemplates();
    const channel = supabase.channel('admin-notif-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'notification_templates' }, (payload) => {
      if (payload.eventType === 'INSERT') setTemplates(prev => [...prev, payload.new as NotificationTemplate]);
      else if (payload.eventType === 'UPDATE') setTemplates(prev => prev.map(t => t.id === (payload.new as NotificationTemplate).id ? payload.new as NotificationTemplate : t));
      else if (payload.eventType === 'DELETE') setTemplates(prev => prev.filter(t => t.id !== (payload.old as NotificationTemplate).id));
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTemplates]);

  const toggleActive = async (t: NotificationTemplate) => { await supabase.from('notification_templates').update({ is_active: !t.is_active }).eq('id', t.id); };

  return (
    <div className="p-4 space-y-3">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 px-4 py-3"><h3 className="text-sm font-bold text-white flex items-center gap-2"><Bell className="w-4 h-4 text-orange-400" /> Plantillas de Notificaciones</h3><p className="text-[10px] text-gray-500 mt-0.5">Variables: {'{customer_name}'}, {'{order_id}'}, {'{total}'}</p></div>
      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
      : templates.map(t => { const sc = STATUS_CONFIG[t.status_key] ?? STATUS_CONFIG.recibido; return (
        <div key={t.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${sc.dot}`} /><span className="text-sm font-bold text-white">{sc.label}</span></div>
            <button onClick={() => toggleActive(t)} className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${t.is_active ? 'bg-green-900/40 text-green-400 border border-green-800/50' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>{t.is_active ? 'Activa' : 'Inactiva'}</button>
          </div>
          <p className="text-sm font-bold text-white">{t.title}</p><p className="text-xs text-gray-400 mt-1">{t.message}</p>
          <button onClick={() => setEditing(t)} className="mt-2 flex items-center gap-1 text-xs font-bold text-blue-400"><Pencil className="w-3 h-3" /> Editar</button>
        </div>
      ); })}
      {editing && <NotifEditor template={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); fetchTemplates(); }} saving={saving} setSaving={setSaving} />}
    </div>
  );
}

function NotifEditor({ template, onClose, onSaved, saving, setSaving }: { template: NotificationTemplate; onClose: () => void; onSaved: () => void; saving: boolean; setSaving: (b: boolean) => void }) {
  const [title, setTitle] = useState(template.title);
  const [message, setMessage] = useState(template.message);
  const [isActive, setIsActive] = useState(template.is_active);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (!title.trim() || !message.trim()) { setError('Completa título y mensaje'); return; }
    setSaving(true);
    try { const { error: e } = await supabase.from('notification_templates').update({ title: title.trim(), message: message.trim(), is_active: isActive, updated_at: new Date().toISOString() }).eq('id', template.id); if (e) throw e; onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  const insertVar = (v: string) => { setMessage(m => m + v); };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-gray-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-gray-800 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-800 sticky top-0 bg-gray-900 z-10"><h3 className="text-base font-bold text-white">Editar Notificación</h3><button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center"><X className="w-5 h-5 text-gray-400" /></button></div>
        <div className="p-5 space-y-4">
          <div><label className="text-xs font-bold text-gray-400 mb-1.5 block">Título</label><input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3.5 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
          <div><label className="text-xs font-bold text-gray-400 mb-1.5 block">Mensaje</label><textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} className="w-full px-3.5 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-orange-500 resize-none" /></div>
          <div className="flex gap-1.5">{['{customer_name}', '{order_id}', '{total}'].map(v => <button key={v} onClick={() => insertVar(v)} className="px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-[10px] font-mono text-orange-400">{v}</button>)}</div>
          <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 accent-orange-500" /><span className="text-sm font-bold text-white">Activa</span></label>
          {error && <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-400" /><p className="text-xs text-red-400">{error}</p></div>}
          <button onClick={save} disabled={saving} className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Guardar</>}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Tasa BCV Consensus Tab ─────────────────────────────────────────────────
function TasaBcvTab({ profile }: { profile: UserProfile }) {
  const { rateData, loading, runConsensus, approveRate } = useBcvRate();
  const [manualRate, setManualRate] = useState('');
  const [approving, setApproving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setRunning(true); setError(null);
    try { await runConsensus(); } catch { setError('Error al ejecutar verificación'); }
    finally { setRunning(false); }
  };

  const handleApprove = async () => {
    const rate = Number(manualRate);
    if (!Number.isFinite(rate) || rate <= 0) { setError('Ingrese una tasa válida'); return; }
    setApproving(true); setError(null);
    try { await approveRate(rate, profile?.phone ?? 'admin'); setManualRate(''); } catch { setError('Error al aprobar tasa'); }
    finally { setApproving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  const statusLabel = rateData.status === 'locked' ? 'Bloqueada (Consenso)' : rateData.status === 'manual' ? 'Aprobada Manualmente' : 'Pendiente de Aprobación';
  const statusColor = rateData.status === 'locked' ? 'text-emerald-400' : rateData.status === 'manual' ? 'text-blue-400' : 'text-amber-400';

  return (
    <div className="space-y-4">
      {rateData.alert_active && (
        <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-900/50 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-red-300 mb-1">Alerta de Discrepancia de Tasa</h3>
              <p className="text-xs text-red-400/80 leading-relaxed">No se logró quórum automático entre las fuentes. Por favor, verifique la tasa real del BCV y apruébela manualmente para continuar.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input type="number" step="0.01" inputMode="decimal" value={manualRate} onChange={e => setManualRate(e.target.value)} placeholder="Tasa BCV (Bs.)" className="flex-1 px-3.5 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500" />
            <button onClick={handleApprove} disabled={approving} className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 whitespace-nowrap">{approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Aprobar Tasa</>}</button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}

      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center"><BadgePercent className="w-5 h-5 text-orange-500" /></div>
            <div>
              <h3 className="text-sm font-black text-white">Tasa BCV Oficial</h3>
              <p className="text-[10px] text-gray-500">Sistema de consenso multi-fuente</p>
            </div>
          </div>
          <button onClick={handleRun} disabled={running} className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center active:scale-90 disabled:opacity-50">{running ? <Loader2 className="w-4 h-4 text-orange-500 animate-spin" /> : <RefreshCw className="w-4 h-4 text-gray-400" />}</button>
        </div>

        <div className="flex items-end gap-2">
          <span className="text-4xl font-black text-white tabular-nums">{rateData.rate.toFixed(2)}</span>
          <span className="text-sm font-bold text-gray-500 mb-1.5">Bs./USD</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold ${statusColor}`}>{statusLabel}</span>
          {rateData.status === 'locked' && <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold"><Lock className="w-3 h-3" /> Congelada</span>}
          {rateData.weekend && <span className="text-[10px] text-blue-400 font-bold bg-blue-950/40 px-2 py-0.5 rounded">Fin de semana (tasa del viernes)</span>}
        </div>

        <div className="text-[10px] text-gray-500">
          Fecha de tasa: <span className="font-bold text-gray-400">{rateData.rate_date || '—'}</span>
          {rateData.last_verified_at && <span className="ml-3">Verificada: {new Date(rateData.last_verified_at).toLocaleString('es-VE')}</span>}
          {rateData.approved_by && <span className="ml-3">Por: {rateData.approved_by}</span>}
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3">
        <h3 className="text-sm font-black text-white flex items-center gap-2"><Radio className="w-4 h-4 text-orange-500" /> Fuentes de Verificación</h3>
        <p className="text-[10px] text-gray-500">Consenso analizado sobre {rateData.consensus_count}/3 fuentes activas. Se requiere que al menos 2 coincidan plenamente.</p>
        <div className="space-y-2">
          {['DolarApi', 'MonitorDivisas', 'PyDolarVzla'].map(name => {
            const sourceObj = rateData.sources?.[name]; 
            const val = typeof sourceObj === "object" && sourceObj !== null ? sourceObj.rate : sourceObj;
            const isMatch = rateData.matching_sources?.includes(name);
            return (
              <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50 border border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${val !== null && val !== undefined ? (isMatch ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-red-500'}`} />
                  <span className="text-xs font-bold text-white">{name}</span>
                </div>
                <span className={`text-sm font-black tabular-nums ${val !== null && val !== undefined ? 'text-gray-200' : 'text-red-500'}`}>{val !== null && val !== undefined ? `${Number(val || 0).toFixed(2)} Bs.` : 'Sin datos'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {!rateData.alert_active && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3">
          <h3 className="text-sm font-black text-white">Aprobación Manual</h3>
          <p className="text-[10px] text-gray-500">Use solo si necesita corregir la tasa fuera del ciclo de consenso automático.</p>
          <div className="flex gap-2">
            <input type="number" step="0.01" inputMode="decimal" value={manualRate} onChange={e => setManualRate(e.target.value)} placeholder="Nueva tasa (Bs.)" className="flex-1 px-3.5 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500" />
            <button onClick={handleApprove} disabled={approving} className="px-5 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 whitespace-nowrap">{approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Aprobar</>}</button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}

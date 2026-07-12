import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  ChefHat,
  PackageCheck,
  Phone,
  MapPin,
  Receipt,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  Bell,
  LogOut,
  NotebookPen,
  UtensilsCrossed,
  BarChart3,
  Megaphone,
} from 'lucide-react';
import { useOrders, type OrderStatus } from '../hooks/useOrders';
import { useAudioAlert } from '../hooks/useAudioAlert';
import type { Order } from '../lib/supabase';
import { MenuManager } from './MenuManager';
import { SalesReport } from './SalesReport';
import { MarketingPanel } from './MarketingPanel';

// ─── Types ────────────────────────────────────────────────────────────────────
type KitchenTab = 'recibido' | 'en_cocina' | 'listo_despacho';
type AdminSection = 'cocina' | 'menu' | 'ventas' | 'marketing';

// ─── Kitchen sub-tabs ─────────────────────────────────────────────────────────
const KITCHEN_TABS: { id: KitchenTab; label: string; icon: typeof Clock; color: string }[] = [
  { id: 'recibido',       label: 'Recibidos', icon: Clock,        color: 'text-orange-500' },
  { id: 'en_cocina',      label: 'En Cocina', icon: ChefHat,      color: 'text-blue-500'   },
  { id: 'listo_despacho', label: 'Listos',    icon: PackageCheck, color: 'text-green-500'  },
];

// ─── Admin sections ───────────────────────────────────────────────────────────
const SECTIONS: { id: AdminSection; label: string; icon: typeof ChefHat }[] = [
  { id: 'cocina',    label: 'Cocina',    icon: ChefHat         },
  { id: 'menu',      label: 'Menú',      icon: UtensilsCrossed },
  { id: 'ventas',    label: 'Ventas',    icon: BarChart3       },
  { id: 'marketing', label: 'Marketing', icon: Megaphone       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

// ─── OrderCard ────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  onStatusChange,
}: {
  order: Order;
  onStatusChange: (id: string, status: OrderStatus) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(false);

  const handleStatus = async (status: OrderStatus) => {
    setUpdating(true);
    try { await onStatusChange(order.id, status); }
    catch { /* handled by parent */ }
    finally { setUpdating(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="font-bold text-sm text-gray-900">{order.customer_name}</p>
            <p className="text-[11px] text-gray-400">{formatTime(order.created_at)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-black text-base text-gray-900">${Number(order.total).toFixed(2)}</p>
          <p className="text-[11px] text-gray-400">{order.delivery_zone}</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Items */}
        <div className="space-y-1">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-700">
                <span className="font-bold text-gray-900">{item.quantity}×</span> {item.name}
              </span>
              <span className="text-gray-400 font-medium">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Phone className="w-3 h-3 text-gray-300 flex-shrink-0" />
            <span className="truncate">{order.customer_phone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <MapPin className="w-3 h-3 text-gray-300 flex-shrink-0" />
            <span className="truncate">{order.delivery_address}</span>
          </div>
        </div>

        {/* Notas */}
        {order.notas && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 flex items-start gap-2">
            <NotebookPen className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-0.5">Notas del cliente</p>
              <p className="text-sm text-amber-900 leading-snug">{order.notas}</p>
            </div>
          </div>
        )}

        {/* Payment */}
        <div className="bg-orange-50/50 border border-orange-100 rounded-lg px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Receipt className="w-3 h-3 text-orange-400 flex-shrink-0" />
            <span className="font-semibold text-orange-700">Ref:</span>
            <span className="font-mono truncate">{order.payment_reference}</span>
          </div>
          {order.payment_screenshot_url && (
            <button
              onClick={() => setShowScreenshot(!showScreenshot)}
              className="text-[11px] text-blue-500 underline underline-offset-2 font-medium"
            >
              {showScreenshot ? 'Ocultar captura' : 'Ver captura del pago'}
            </button>
          )}
          {showScreenshot && order.payment_screenshot_url && (
            <div className="rounded-lg overflow-hidden mt-1">
              <img src={order.payment_screenshot_url} alt="Captura del pago" className="w-full h-auto" />
            </div>
          )}
        </div>

        {/* Subtotal */}
        <div className="flex justify-between text-[11px] text-gray-400">
          <span>Subtotal: ${Number(order.subtotal).toFixed(2)} · Envío: ${Number(order.delivery_fee).toFixed(2)}</span>
          <span className="font-semibold text-gray-500">Total: ${Number(order.total).toFixed(2)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4">
        {order.status === 'recibido' && (
          <button
            onClick={() => handleStatus('en_cocina')}
            disabled={updating}
            className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ChefHat className="w-4 h-4" />Pasar a Cocina</>}
          </button>
        )}
        {order.status === 'en_cocina' && (
          <button
            onClick={() => handleStatus('listo_despacho')}
            disabled={updating}
            className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm active:scale-[0.98] transition-all shadow-sm shadow-green-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PackageCheck className="w-4 h-4" />Listo para Despacho</>}
          </button>
        )}
        {order.status === 'listo_despacho' && (
          <div className="w-full py-3 rounded-xl bg-green-50 text-green-600 font-bold text-sm text-center flex items-center justify-center gap-2">
            <PackageCheck className="w-4 h-4" />Listo para entrega
          </div>
        )}
        {order.status === 'recibido' && (
          <div className="flex items-center gap-1.5 mt-2">
            <ImageIcon className="w-3 h-3 text-gray-300" />
            <span className="text-[11px] text-gray-400">Pago Móvil · {order.payment_method}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KitchenView ──────────────────────────────────────────────────────────────
function KitchenView({
  orders, loading, error, updateOrderStatus,
  soundEnabled, setSoundEnabled,
  hasNewOrder, onTabView,
}: {
  orders: Order[];
  loading: boolean;
  error: string | null;
  updateOrderStatus: (id: string, s: OrderStatus) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  hasNewOrder: boolean;
  onTabView: (t: KitchenTab) => void;
}) {
  const [activeTab, setActiveTab] = useState<KitchenTab>('recibido');

  useEffect(() => { onTabView(activeTab); }, [activeTab]);

  const counts: Record<KitchenTab, number> = {
    recibido:       orders.filter(o => o.status === 'recibido').length,
    en_cocina:      orders.filter(o => o.status === 'en_cocina').length,
    listo_despacho: orders.filter(o => o.status === 'listo_despacho').length,
  };

  const filtered = useMemo(
    () => orders.filter(o => o.status === activeTab),
    [orders, activeTab]
  );

  return (
    <>
      {/* Sound toggle */}
      <div className="flex items-center justify-end px-4 py-2 gap-2">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
            soundEnabled ? 'bg-orange-50 text-orange-500' : 'bg-gray-50 text-gray-400'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          {soundEnabled ? 'Alertas ON' : 'Alertas OFF'}
        </button>
      </div>

      {/* New order banner */}
      {hasNewOrder && (
        <div className="px-4 pb-2">
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-500 animate-pulse" />
            <span className="text-xs font-bold text-orange-600">¡Nuevo pedido recibido!</span>
          </div>
        </div>
      )}

      {/* Kitchen sub-tabs */}
      <div className="flex px-4 gap-1 border-b border-gray-100">
        {KITCHEN_TABS.map(tab => {
          const count = counts[tab.id];
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold border-b-2 transition-all ${
                isActive ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? tab.color : ''}`} />
              {tab.label}
              {count > 0 && (
                <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  isActive ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders */}
      <main className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
            <p className="text-sm text-gray-400 mt-3">Cargando pedidos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-20 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
            <p className="text-sm font-bold text-gray-900 mb-1">Error</p>
            <p className="text-xs text-gray-400">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              {activeTab === 'recibido' && <Clock className="w-7 h-7 text-gray-200" />}
              {activeTab === 'en_cocina' && <ChefHat className="w-7 h-7 text-gray-200" />}
              {activeTab === 'listo_despacho' && <PackageCheck className="w-7 h-7 text-gray-200" />}
            </div>
            <p className="text-sm text-gray-400 font-medium">
              No hay pedidos {activeTab === 'recibido' ? 'pendientes' : activeTab === 'en_cocina' ? 'en cocina' : 'listos'}
            </p>
          </div>
        ) : (
          filtered.map(order => (
            <OrderCard key={order.id} order={order} onStatusChange={updateOrderStatus} />
          ))
        )}
      </main>
    </>
  );
}

// ─── AdminPanel (root) ────────────────────────────────────────────────────────
export function AdminPanel({ onExit, onLogout }: { onExit: () => void; onLogout: () => void }) {
  const { orders, loading, error, updateOrderStatus } = useOrders();
  const [section, setSection] = useState<AdminSection>('cocina');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasNewOrder, setHasNewOrder] = useState(false);
  const [kitchenTab, setKitchenTab] = useState<KitchenTab>('recibido');

  useAudioAlert(soundEnabled && hasNewOrder);

  useEffect(() => {
    function onNew(e: Event) {
      const order = (e as CustomEvent<Order>).detail;
      if (order.status === 'recibido') setHasNewOrder(true);
    }
    window.addEventListener('new-order', onNew);
    return () => window.removeEventListener('new-order', onNew);
  }, []);

  // Clear alert when user sees the recibido tab in cocina section
  useEffect(() => {
    if (section === 'cocina' && kitchenTab === 'recibido') setHasNewOrder(false);
  }, [section, kitchenTab]);

  const pendingCount = orders.filter(o => o.status === 'recibido').length;

  const SECTION_LABELS: Record<AdminSection, string> = {
    cocina:    'Control de Cocina',
    menu:      'Gestión del Menú',
    ventas:    'Reporte de Ventas',
    marketing: 'Campañas de Marketing',
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100">
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
              <h1 className="text-base font-bold text-gray-900 leading-tight">Panel Admin</h1>
              <p className="text-[11px] text-gray-400 font-medium leading-tight">{SECTION_LABELS[section]}</p>
            </div>
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

        {/* ── Section tabs ──────────────────────────────────────────────────── */}
        <div className="flex px-4 gap-1 pb-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const isActive = section === id;
            const badge = id === 'cocina' && pendingCount > 0 && section !== 'cocina';
            return (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold border-b-2 transition-all relative ${
                  isActive ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-orange-500' : ''}`} />
                {label}
                {badge && (
                  <span className="absolute top-2 right-3 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sections ──────────────────────────────────────────────────────── */}
      {section === 'cocina' && (
        <KitchenView
          orders={orders}
          loading={loading}
          error={error}
          updateOrderStatus={updateOrderStatus}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          hasNewOrder={hasNewOrder}
          onTabView={setKitchenTab}
        />
      )}

      {section === 'menu' && (
        <div className="px-4 py-4">
          <MenuManager />
        </div>
      )}

      {section === 'ventas' && (
        <div className="px-4 py-4">
          <SalesReport />
        </div>
      )}

      {section === 'marketing' && (
        <div className="px-4 py-4">
          <MarketingPanel />
        </div>
      )}
    </div>
  );
}

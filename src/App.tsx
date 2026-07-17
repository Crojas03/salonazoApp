import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, type Category, type Product, type OrderRow, DELIVERY_ZONES } from './lib/supabase';
import { useProfile, type UserProfile } from './hooks/useProfile';
import { useCart } from './hooks/useCart';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { CategoryTabs } from './components/CategoryTabs';
import { ProductCard } from './components/ProductCard';
import { BannerCarousel } from './components/BannerCarousel';
import { CartSheet } from './components/CartSheet';
import { AuthModal } from './components/AuthModal';
import { OperatorAuthModal } from './components/OperatorAuthModal';
import { OrderHistory } from './components/OrderHistory';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminDashboard } from './components/AdminDashboard';
import { DeliveryPanel } from './components/DeliveryPanel';
import { useBcvRate } from './hooks/useBcvRate';
import { Lock, Loader2, ArrowLeft } from 'lucide-react';

type View = 'menu' | 'cart' | 'checkout' | 'tracking' | 'orders' | 'admin' | 'delivery';

export default function App() {
  const {
    profile, saveProfile, clearProfile, register, login,
    staffRoles, canAccessAdmin, canAccessDelivery, isOperator,
    operatorAuthed, grantOperatorAccess, revokeOperatorAccess, hasOperatorAuth,
  } = useProfile();
  const cart = useCart();
  const { refresh: refreshBcvRate } = useBcvRate();

  // Clear stale rate cache on profile/session change
  useEffect(() => { refreshBcvRate(); }, [profile?.phone, refreshBcvRate]);

  const [view, setView] = useState<View>('menu');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deliveryZoneId, setDeliveryZoneId] = useState<string | null>(null);
  const [deliveryZoneName, setDeliveryZoneName] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<OrderRow | null>(null);

  // Operator auth modal state
  const [opAuthOpen, setOpAuthOpen] = useState(false);
  const [opAuthMode, setOpAuthMode] = useState<'setup' | 'verify'>('setup');
  const [pendingView, setPendingView] = useState<View | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: cats, error: e1 }, { data: prods, error: e2 }] = await Promise.all([
          supabase.from('categories').select('*').order('sort_order', { ascending: true }),
          supabase.from('products').select('*').order('sort_order', { ascending: true }),
        ]);
        if (e1 || e2) throw e1 ?? e2;
        setCategories((cats ?? []) as Category[]);
        setProducts((prods ?? []) as Product[]);
        if (cats && cats.length > 0) setActiveCategory((cats[0] as Category).slug);
      } catch { /* */ }
      finally { setLoading(false); }
    })();

    const channel = supabase.channel('app-products-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
      if (payload.eventType === 'INSERT') setProducts(prev => [...prev, payload.new as Product]);
      else if (payload.eventType === 'UPDATE') setProducts(prev => prev.map(p => p.id === (payload.new as Product).id ? payload.new as Product : p));
      else if (payload.eventType === 'DELETE') setProducts(prev => prev.filter(p => p.id !== (payload.old as Product).id));
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { cart.setDeliveryFee(deliveryFee); }, [deliveryFee, cart]);

  const handleZoneChange = useCallback((zId: string, fee: number, name: string) => {
    setDeliveryZoneId(zId); setDeliveryFee(fee); setDeliveryZoneName(name);
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) return products.filter(p => p.name.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q) ?? false) || categories.find(c => c.id === p.category_id)?.name.toLowerCase().includes(q));
    if (!activeCategory) return products;
    const cat = categories.find(c => c.slug === activeCategory);
    return cat ? products.filter(p => p.category_id === cat.id) : products;
  }, [products, categories, activeCategory, searchQuery]);

  const goCheckout = () => { setCartOpen(false); setCheckoutOpen(true); };
  const onOrderSuccess = (id: string) => {
    setCheckoutOpen(false); setTrackingId(id); setView('tracking');
    cart.clearCart();
  };

  // Operator access guard: when switching to admin/delivery, check if operator auth is needed
  const requestOperatorAccess = (target: View) => {
    if (!profile || !isOperator) return;
    if (operatorAuthed) { setView(target); return; }
    // Need to authenticate
    setOpAuthMode(hasOperatorAuth ? 'verify' : 'setup');
    setPendingView(target);
    setOpAuthOpen(true);
  };

  const onOpAuthSuccess = () => {
    setOpAuthOpen(false);
    grantOperatorAccess();
    if (pendingView) setView(pendingView);
    setPendingView(null);
  };

  const switchToAdmin = () => requestOperatorAccess('admin');
  const switchToDelivery = () => requestOperatorAccess('delivery');

  const handleLogout = () => { clearProfile(); revokeOperatorAccess(); setView('menu'); };

  const cartQtyMap = useMemo(() => { const m = new Map<string, number>(); cart.items.forEach(i => m.set(i.product.id, i.quantity)); return m; }, [cart.items]);

  // Tracking view
  useEffect(() => {
    if (view !== 'tracking' || !trackingId) return;
    let cancelled = false;
    const fetchOrder = async () => {
      const { data } = await supabase.from('orders').select('*').eq('id', trackingId).maybeSingle();
      if (!cancelled) setTrackedOrder(data as OrderRow | null);
    };
    fetchOrder();
    const channel = supabase.channel(`track-${trackingId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${trackingId}` }, (payload) => {
      if (payload.eventType === 'UPDATE') setTrackedOrder(payload.new as OrderRow);
    }).subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [view, trackingId]);

  // RBAC guards with operator auth check
  if (view === 'admin') {
    if (!profile || !canAccessAdmin) return <BlockedView msg="Acceso restringido. Solo personal autorizado." onBack={() => setView('menu')} />;
    if (!operatorAuthed) {
      // Trigger operator auth flow
      requestOperatorAccess('admin');
      return <BlockedView msg="Verificación de operador requerida." onBack={() => setView('menu')} />;
    }
    return <ErrorBoundary label="Admin Dashboard"><AdminDashboard profile={profile} onBack={() => setView('menu')} staffRoles={staffRoles} /></ErrorBoundary>;
  }
  if (view === 'delivery') {
    if (!profile || !canAccessDelivery) return <BlockedView msg="Acceso restringido. Solo repartidores." onBack={() => setView('menu')} />;
    if (!operatorAuthed) {
      requestOperatorAccess('delivery');
      return <BlockedView msg="Verificación de operador requerida." onBack={() => setView('menu')} />;
    }
    return <ErrorBoundary label="Delivery Panel"><DeliveryPanel profile={profile} onBack={() => setView('menu')} staffRoles={staffRoles} /></ErrorBoundary>;
  }
  if (view === 'orders') return <ErrorBoundary label="Mis Pedidos"><OrderHistory profile={profile} onBack={() => setView('menu')} onAuthClick={() => setAuthOpen(true)} /></ErrorBoundary>;
  if (view === 'tracking' && trackingId) return <TrackingView order={trackedOrder} onBack={() => { setView('menu'); setTrackingId(null); setTrackedOrder(null); }} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <ErrorBoundary label="El Salonazo">
        <Header
          cartCount={cart.totalItems} onCartClick={() => setCartOpen(true)}
          profile={profile} onAuthClick={() => setAuthOpen(true)} onLogout={handleLogout}
          onTrackClick={() => setView('orders')}
          deliveryAddress={deliveryZoneName || profile?.address || ''}
          onAddressClick={() => setAddressPickerOpen(true)}
          searchQuery={searchQuery} onSearchChange={setSearchQuery}
          staffRoles={staffRoles} canAccessAdmin={canAccessAdmin} canAccessDelivery={canAccessDelivery}
          onSwitchToAdmin={switchToAdmin} onSwitchToDelivery={switchToDelivery}
        />

        {loading ? (
          <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
        ) : (
          <>
            {!searchQuery && <BannerCarousel />}
            {!searchQuery && <CategoryTabs categories={categories} activeCategory={activeCategory} onSelect={setActiveCategory} />}

            <div className="px-4 py-3 space-y-3">
              {searchQuery && filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-gray-400"><p className="text-sm font-bold">Sin resultados para "{searchQuery}"</p></div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-gray-400"><p className="text-sm font-bold">No hay productos</p></div>
              ) : (
                <div className="space-y-3">
                  {filteredProducts.map(p => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      quantity={cartQtyMap.get(p.id) ?? 0}
                      onAdd={() => cart.addItem(p)}
                      onIncrement={() => cart.incrementItem(p.id)}
                      onDecrement={() => cart.decrementItem(p.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </ErrorBoundary>

      <CartSheet
        open={cartOpen} items={cart.items} subtotal={cart.subtotal} discount={cart.discount}
        coupon={cart.coupon} deliveryFee={deliveryFee} total={cart.total}
        notas={''} onNotasChange={() => {}}
        onClose={() => setCartOpen(false)}
        onIncrement={cart.incrementItem} onDecrement={cart.decrementItem} onRemove={cart.removeItem}
        onCheckout={goCheckout}
        onRedeemCoupon={cart.redeemCoupon} onRemoveCoupon={cart.removeCoupon}
      />

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onLogin={(p: UserProfile) => { setAuthOpen(false); saveProfile(p); }}
        register={register}
        login={login}
      />

      <OperatorAuthModal
        open={opAuthOpen}
        mode={opAuthMode}
        phone={profile?.phone ?? ''}
        email={profile?.email ?? null}
        onClose={() => { setOpAuthOpen(false); setPendingView(null); }}
        onSuccess={onOpAuthSuccess}
      />

      <CheckoutModal
        open={checkoutOpen} items={cart.items} subtotal={cart.subtotal} discount={cart.discount}
        couponCode={cart.coupon?.code ?? null} deliveryZone={deliveryZoneId} notas={''}
        products={products} onZoneChange={handleZoneChange}
        onClose={() => setCheckoutOpen(false)} onBack={() => { setCheckoutOpen(false); setCartOpen(true); }}
        onSuccess={onOrderSuccess} onAddProduct={cart.addItem} profile={profile}
      />

      {addressPickerOpen && (
        <AddressPicker
          currentZone={deliveryZoneName}
          onSelect={(zId, fee, name) => { handleZoneChange(zId, fee, name); setAddressPickerOpen(false); }}
          onClose={() => setAddressPickerOpen(false)}
        />
      )}
    </div>
  );
}

function BlockedView({ msg, onBack }: { msg: string; onBack: () => void }) {
  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4"><Lock className="w-8 h-8 text-gray-500" /></div>
      <h2 className="text-lg font-bold mb-2">Acceso Restringido</h2>
      <p className="text-sm text-gray-500 mb-6">{msg}</p>
      <button onClick={onBack} className="px-6 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Volver</button>
    </div>
  );
}

function AddressPicker({ currentZone, onSelect, onClose }: { currentZone: string; onSelect: (id: string, fee: number, name: string) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl animate-slide-up flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="pt-3 pb-1 flex justify-center"><div className="w-10 h-1.5 rounded-full bg-gray-200" /></div>
        <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50"><h2 className="text-lg font-bold text-gray-900">Zona de entrega</h2><button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center"><ArrowLeft className="w-5 h-5 text-gray-500" /></button></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {currentZone && <div className="text-xs text-gray-400 mb-2">Actual: <span className="font-bold text-gray-700">{currentZone}</span></div>}
          {(['cerca', 'media', 'lejos'] as const).map(tier => (
            <div key={tier}>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">{tier === 'cerca' ? 'Cerca' : tier === 'media' ? 'Zona media' : 'Lejos'}</p>
              {DELIVERY_ZONES.filter(z => z.tier === tier).map(z => (
                <button key={z.id} onClick={() => onSelect(z.id, z.fee, z.name)} className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-[0.98] mb-1.5">
                  <span className="text-sm font-bold text-gray-900">{z.name}</span>
                  <span className="text-sm font-black text-orange-500">${z.fee.toFixed(2)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function TrackingView({ order, onBack }: { order: OrderRow | null; onBack: () => void }) {
  const STATUS_CONFIG = {
    recibido: { label: 'Recibido', color: 'text-blue-600', bg: 'bg-blue-500', icon: '📋' },
    preparando: { label: 'Preparando', color: 'text-amber-600', bg: 'bg-amber-500', icon: '👨‍🍳' },
    listo_delivery: { label: 'Listo para Entrega', color: 'text-emerald-600', bg: 'bg-emerald-500', icon: '📦' },
    en_camino: { label: 'En Camino', color: 'text-purple-600', bg: 'bg-purple-500', icon: '🛵' },
    entregado: { label: 'Entregado', color: 'text-green-600', bg: 'bg-green-500', icon: '✅' },
    cancelado: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-500', icon: '❌' },
  };
  const flow = ['recibido', 'preparando', 'listo_delivery', 'en_camino', 'entregado'] as const;
  const currentIdx = order ? flow.indexOf(order.status as typeof flow[number]) : -1;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col">
      <div className="px-4 py-3.5 flex items-center gap-3 bg-white border-b border-gray-50"><button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center active:scale-90"><ArrowLeft className="w-5 h-5 text-gray-600" /></button><h2 className="text-lg font-bold text-gray-900">Seguimiento</h2></div>
      <div className="flex-1 p-4 space-y-4">
        {!order ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
        : (<>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">Pedido #{order.id.slice(0, 8)}</p>
            <div className="space-y-4">
              {flow.map((status, i) => {
                const cfg = STATUS_CONFIG[status];
                const done = i <= currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${done ? cfg.bg : 'bg-gray-100'}`}>{done ? '✓' : cfg.icon}</div>
                    <div className="flex-1"><p className={`text-sm font-bold ${done ? 'text-gray-900' : 'text-gray-400'}`}>{cfg.label}</p>{isCurrent && <p className="text-[10px] text-orange-500 font-bold">En progreso...</p>}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <h3 className="text-sm font-bold text-gray-900">Resumen</h3>
            {(Array.isArray(order.items) ? order.items : []).map((it, i) => <div key={i} className="flex justify-between text-xs"><span className="text-gray-500">{it.quantity}x {it.name}</span><span className="font-semibold text-gray-600">${(Number(it.price) * it.quantity).toFixed(2)}</span></div>)}
            <div className="flex justify-between pt-2 border-t border-gray-50"><span className="font-bold text-gray-900 text-sm">Total</span><span className="font-black text-orange-500">${Number(order.total).toFixed(2)}</span></div>
          </div>
        </>)}
      </div>
    </div>
  );
}

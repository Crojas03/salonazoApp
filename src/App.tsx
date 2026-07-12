import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, UtensilsCrossed, Clock } from 'lucide-react';
import { supabase, type Category, type Product } from './lib/supabase';
import { useCart } from './hooks/useCart';
import { useAuth, getPinnedRole } from './hooks/useAuth';
import { useProfile, getProfileZone } from './hooks/useProfile';
import { useNotifications } from './hooks/useNotifications';
import { Header } from './components/Header';
import { CategoryTabs } from './components/CategoryTabs';
import { ProductCard } from './components/ProductCard';
import { CartSheet } from './components/CartSheet';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminPanel } from './components/AdminPanel';
import { DriverView } from './components/DriverView';
import { LoginScreen } from './components/LoginScreen';
import { BannerCarousel } from './components/BannerCarousel';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { OrderTrackingScreen } from './components/OrderTrackingScreen';

// ─── URL-based role detection ─────────────────────────────────────────────────
type AppMode = 'cliente' | 'admin' | 'driver';

function detectMode(): AppMode {
  const path = window.location.pathname.replace(/\/$/, '').toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const modeParam = params.get('mode')?.toLowerCase() ?? '';

  if (path === '/admin' || modeParam === 'admin') return 'admin';
  if (path === '/delivery' || modeParam === 'moto') return 'driver';

  const pinned = getPinnedRole();
  if (pinned === 'admin') return 'admin';
  if (pinned === 'driver') return 'driver';

  return 'cliente';
}

type View = 'menu' | 'cart' | 'checkout' | 'tracking';

export default function App() {
  const [mode] = useState<AppMode>(detectMode);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [view, setView] = useState<View>('menu');
  const [deliveryZone, setDeliveryZone] = useState<string | null>(null);
  const [notas, setNotas] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Persist active order ID so tracking survives a page refresh
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(() => {
    try { return localStorage.getItem('salonazo-active-order'); } catch { return null; }
  });

  const setActiveOrder = (id: string | null) => {
    if (id) localStorage.setItem('salonazo-active-order', id);
    else localStorage.removeItem('salonazo-active-order');
    setTrackingOrderId(id);
  };

  const cart = useCart();
  const auth = useAuth();
  const { profile, saveProfile, clearProfile, loginByPhone } = useProfile();
  const { notifications, unreadCount, read, markAllRead, markRead } = useNotifications(
    mode === 'cliente' ? profile : null
  );

  // Auto-apply delivery fee when profile zone is set
  useEffect(() => {
    if (profile) {
      const zone = getProfileZone(profile);
      if (zone) cart.setDeliveryFee(zone.fee);
    }
  }, [profile?.zone_id]);

  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, prodRes] = await Promise.all([
          supabase.from('categories').select('*').order('sort_order'),
          supabase.from('products').select('*').order('sort_order'),
        ]);
        if (catRes.error) throw catRes.error;
        if (prodRes.error) throw prodRes.error;
        setCategories(catRes.data ?? []);
        setProducts(prodRes.data ?? []);
        if (catRes.data?.length) setActiveCategory(catRes.data[0].slug);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar el menú');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-4">
          <UtensilsCrossed className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        <p className="text-sm text-gray-400 mt-3 font-medium">Cargando menú...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center bg-white">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-lg font-bold text-gray-900 mb-1">No se pudo cargar el menú</p>
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    );
  }

  // ── ADMIN mode ───────────────────────────────────────────────────────────────
  if (mode === 'admin') {
    if (!auth.isAdmin) {
      return (
        <LoginScreen
          role="admin"
          onLogin={(pwd) => auth.login('admin', pwd)}
          onCancel={() => { window.location.href = '/'; }}
        />
      );
    }
    return (
      <AdminPanel
        onExit={() => { window.location.href = '/'; }}
        onLogout={() => auth.logout()}
      />
    );
  }

  // ── DRIVER mode ──────────────────────────────────────────────────────────────
  if (mode === 'driver') {
    if (!auth.isDriver) {
      return (
        <LoginScreen
          role="driver"
          onLogin={(pwd) => auth.login('driver', pwd)}
          onCancel={() => { window.location.href = '/'; }}
        />
      );
    }
    return (
      <DriverView
        onExit={() => { window.location.href = '/'; }}
        onLogout={() => auth.logout()}
      />
    );
  }

  // ── ORDER TRACKING ───────────────────────────────────────────────────────────
  const resolvedOrderId = trackingOrderId ?? (() => { try { return localStorage.getItem('salonazo-active-order'); } catch { return null; } })();
  if (view === 'tracking' && resolvedOrderId) {
    return (
      <div className="max-w-md mx-auto">
        <OrderTrackingScreen
          orderId={resolvedOrderId}
          onBack={() => {
            setActiveOrder(null);
            setView('menu');
          }}
        />
      </div>
    );
  }

  // ── CLIENT / MENU view ───────────────────────────────────────────────────────
  const filteredProducts = activeCategory
    ? products.filter((p) => p.category_id === categories.find((c) => c.slug === activeCategory)?.id)
    : products;

  return (
    <div className="max-w-md mx-auto relative">
      <Header
        cartCount={cart.totalItems}
        onCartClick={() => setView('cart')}
        profile={profile}
        onAuthClick={() => setAuthModalOpen(true)}
        onLogout={clearProfile}
        activeOrderId={trackingOrderId}
        onTrackClick={() => setView('tracking')}
        notifications={notifications}
        unreadCount={unreadCount}
        read={read}
        onMarkAllRead={markAllRead}
        onMarkRead={markRead}
      />

      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      <BannerCarousel />

      <main className="px-4 py-4 pb-28 space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <UtensilsCrossed className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-400 font-medium">No hay productos en esta categoría</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={cart.items.find((i) => i.product.id === product.id)?.quantity ?? 0}
              onAdd={() => cart.addItem(product)}
              onIncrement={() => cart.incrementItem(product.id)}
              onDecrement={() => cart.decrementItem(product.id)}
            />
          ))
        )}
      </main>

      <button
        onClick={() => setView('tracking')}
        className="fixed bottom-24 right-4 bg-orange-500 text-white p-3 rounded-full shadow-lg z-50 flex items-center justify-center"
        title="Ver mi pedido"
      >
        <Clock className="w-5 h-5" />
      </button>

      {cart.totalItems > 0 && view === 'menu' && (
        <button
          onClick={() => setView('cart')}
          className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 z-30"
        >
          <div className="bg-gray-900 rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-2xl shadow-gray-900/30 active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 text-white text-sm font-bold w-7 h-7 rounded-lg flex items-center justify-center">
                {cart.totalItems}
              </div>
              <span className="text-white font-bold text-sm">Ver carrito</span>
            </div>
            <span className="text-white font-bold text-base">${cart.total.toFixed(2)}</span>
          </div>
        </button>
      )}

      <CartSheet
        notas={notas}
        onNotasChange={setNotas}
        open={view === 'cart'}
        items={cart.items}
        subtotal={cart.subtotal}
        discount={cart.discount}
        coupon={cart.coupon}
        deliveryFee={cart.deliveryFee}
        total={cart.total}
        onClose={() => setView('menu')}
        onIncrement={cart.incrementItem}
        onDecrement={cart.decrementItem}
        onRemove={cart.removeItem}
        onCheckout={() => setView('checkout')}
        onRedeemCoupon={cart.redeemCoupon}
        onRemoveCoupon={cart.removeCoupon}
      />

      <CheckoutModal
        open={view === 'checkout'}
        items={cart.items}
        subtotal={cart.subtotal}
        discount={cart.discount}
        couponCode={cart.coupon?.code ?? null}
        deliveryZone={deliveryZone}
        notas={notas}
        profile={profile}
        onZoneChange={(zoneId, fee) => { setDeliveryZone(zoneId); cart.setDeliveryFee(fee); }}
        onClose={() => setView('menu')}
        onBack={() => setView('cart')}
        onSuccess={(orderId) => {
          cart.clearCart();
          setDeliveryZone(null);
          setNotas('');
          setActiveOrder(orderId);
          setView('tracking');
        }}
      />

      <CustomerAuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSave={saveProfile}
        onLogin={loginByPhone}
        existingProfile={profile}
      />
    </div>
  );
}

import { ShoppingBag, UtensilsCrossed, LogIn, LogOut, UserCircle2, AlarmClock } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import type { AppNotification } from '../hooks/useNotifications';
import type { UserProfile } from '../hooks/useProfile';
import { BCV_RATE } from '../lib/supabase';

type Props = {
  cartCount: number;
  onCartClick: () => void;
  profile: UserProfile | null;
  onAuthClick: () => void;
  onLogout: () => void;
  activeOrderId: string | null;
  onTrackClick: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  read: Set<string>;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
};

export function Header({
  cartCount,
  onCartClick,
  profile,
  onAuthClick,
  onLogout,
  activeOrderId,
  onTrackClick,
  notifications,
  unreadCount,
  read,
  onMarkAllRead,
  onMarkRead,
}: Props) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="px-4 py-1 bg-orange-500 flex items-center justify-end">
        <span className="text-[10px] font-bold text-white/90">Tasa BCV: {BCV_RATE.toFixed(2)} Bs/$</span>
      </div>
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        {/* Logo + title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30 flex-shrink-0">
            <UtensilsCrossed className="w-4.5 h-4.5 text-white" strokeWidth={2.5} style={{ width: 18, height: 18 }} />
          </div>
          <div className="min-w-0">
            {profile ? (
              <>
                <p className="text-[11px] text-orange-500 font-bold leading-none">¡Hola, {profile.name.split(' ')[0]}! 👋</p>
                <h1 className="text-sm font-black text-gray-900 leading-tight tracking-tight truncate">
                  El Salonazo
                </h1>
              </>
            ) : (
              <>
                <h1 className="text-sm font-black text-gray-900 leading-tight tracking-tight">
                  El Salonazo
                </h1>
                <p className="text-[10px] text-gray-400 font-medium leading-none mt-0.5">
                  Delivery 25-35 min
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Auth button */}
          {profile ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onAuthClick}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 text-[11px] font-bold transition-all active:scale-95"
                aria-label="Mi perfil"
              >
                <UserCircle2 className="w-4 h-4" />
                <span className="hidden xs:inline">{profile.name.split(' ')[0]}</span>
              </button>
              <button
                onClick={onLogout}
                className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-red-50 flex items-center justify-center transition-all active:scale-90"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5 text-gray-400 hover:text-red-400" />
              </button>
            </div>
          ) : (
            <button
              onClick={onAuthClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-600 hover:text-orange-600 text-[11px] font-bold transition-all active:scale-95"
              aria-label="Iniciar sesión"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Ingresar</span>
            </button>
          )}

          <button
            onClick={onTrackClick}
            className={"relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 " + (activeOrderId ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700" : "bg-gray-100 hover:bg-gray-200 text-gray-500")}
            aria-label="Ver seguimiento de pedido"
          >
            <AlarmClock className="w-3.5 h-3.5" />
            <span>Mis Pedidos</span>
            {activeOrderId && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            read={read}
            onMarkAllRead={onMarkAllRead}
            onMarkRead={onMarkRead}
          />

          <button
            onClick={onCartClick}
            className="relative w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center"
            aria-label="Ver carrito"
          >
            <ShoppingBag className="w-5 h-5 text-gray-700" strokeWidth={2} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-orange-500/40">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

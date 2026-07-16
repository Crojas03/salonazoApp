import { useState } from 'react';
import { ShoppingBag, MapPin, Search, ChevronRight, Receipt, LogOut, ArrowLeft, X, ChefHat, Bike } from 'lucide-react';
import type { UserProfile } from '../hooks/useProfile';
import { ROLE_LABELS, type StaffRole } from '../lib/supabase';
import { useBcvRate } from '../hooks/useBcvRate';

type P = {
  cartCount: number;
  onCartClick: () => void;
  profile: UserProfile | null;
  onAuthClick: () => void;
  onLogout: () => void;
  onTrackClick: () => void;
  deliveryAddress: string;
  onAddressClick: () => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  staffRoles: StaffRole[];
  canAccessAdmin: boolean;
  canAccessDelivery: boolean;
  onSwitchToAdmin: () => void;
  onSwitchToDelivery: () => void;
};

export function Header({
  cartCount, onCartClick, profile, onAuthClick, onLogout, onTrackClick,
  deliveryAddress, onAddressClick, searchQuery, onSearchChange,
  staffRoles, canAccessAdmin, canAccessDelivery, onSwitchToAdmin, onSwitchToDelivery,
}: P) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sf, setSf] = useState(false);
  const { rate } = useBcvRate();
  const greeting = profile ? `Hola, ${profile.name.split(' ')[0]}` : 'Iniciar Sesión';

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-50">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-black text-sm">S</span>
              </div>
              <div className="min-w-0">
                <button onClick={profile ? () => setMenuOpen(true) : onAuthClick} className="flex items-center gap-1.5 active:scale-95">
                  <h1 className="text-base font-bold text-gray-900 truncate">{greeting}</h1>
                  {profile && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                </button>
                <p className="text-[10px] text-gray-400">El Salonazo · Pedidos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {profile && (
                <button onClick={onTrackClick} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all">
                  <Receipt className="w-3.5 h-3.5 text-gray-600" />
                  <span className="text-xs font-bold text-gray-700">Mis Pedidos</span>
                </button>
              )}
              <button onClick={onCartClick} className="relative w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center active:scale-90 transition-all">
                <ShoppingBag className="w-4 h-4 text-gray-600" />
                {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">{cartCount}</span>}
              </button>
            </div>
          </div>
          <div className="mt-2">
            <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-100 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] font-bold text-gray-700">$1</span>
              <span className="text-[11px] text-gray-400">⇄</span>
              <span className="text-[11px] font-bold text-orange-600">Bs. {rate.toFixed(2)}</span>
              <span className="text-[9px] text-gray-400 ml-0.5">BCV</span>
            </div>
          </div>
        </div>
        <button onClick={onAddressClick} className="w-full px-4 py-2 flex items-center gap-2 active:bg-gray-50">
          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[10px] text-gray-400 leading-none mb-0.5">Entregar en</p>
            <p className="text-xs font-bold text-gray-900 truncate">{deliveryAddress || 'Selecciona tu ubicación'}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>
        <div className="px-4 pb-3 pt-1">
          <div className={`flex items-center gap-2.5 bg-gray-50 rounded-2xl px-4 py-3 transition-all ${sf ? 'ring-2 ring-orange-300 bg-white' : ''}`}>
            <Search className={`w-4 h-4 ${sf ? 'text-orange-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              onFocus={() => setSf(true)}
              onBlur={() => setSf(false)}
              placeholder="¿Qué quieres pedir hoy?"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')} className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center active:scale-90">
                <X className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </header>

      {menuOpen && profile && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-0 left-0 right-0 z-50 max-w-md mx-auto bg-white rounded-b-3xl shadow-2xl animate-slide-up">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setMenuOpen(false)} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center active:scale-90">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1" />
              </div>

              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-black text-xl">
                  {profile.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{profile.name}</p>
                  <p className="text-sm text-gray-400">{profile.phone}</p>
                  {staffRoles.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {staffRoles.map(r => (
                        <span key={r} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-900 text-white">{ROLE_LABELS[r]}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {staffRoles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase px-1">Modo Operador</p>
                  {canAccessAdmin && (
                    <button
                      onClick={() => { setMenuOpen(false); onSwitchToAdmin(); }}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 active:scale-[0.98] shadow-lg"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                        <ChefHat className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-bold text-white">Panel de Cocina / Admin</p>
                        <p className="text-xs text-white/60">Gestionar pedidos y menú</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/40" />
                    </button>
                  )}
                  {canAccessDelivery && (
                    <button
                      onClick={() => { setMenuOpen(false); onSwitchToDelivery(); }}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 active:scale-[0.98] shadow-lg"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                        <Bike className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-bold text-white">Panel de Repartidores</p>
                        <p className="text-xs text-white/60">Ver asignaciones</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/40" />
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <button
                  onClick={() => { setMenuOpen(false); onTrackClick(); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 active:scale-[0.98]"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-gray-900">Mis Pedidos</p>
                    <p className="text-xs text-gray-400">Ver historial</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onLogout(); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 active:scale-[0.98]"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                    <LogOut className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-gray-900">Cerrar Sesión</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

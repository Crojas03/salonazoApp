import { useState } from 'react';
import {
  X, User, Phone, MapPin, CalendarDays, LogIn,
  UserPlus, CheckCircle2, ChevronRight, AlertCircle, ChevronDown,
} from 'lucide-react';
import { DELIVERY_ZONES, ZONE_TIER_LABEL } from '../lib/supabase';
import type { UserProfile } from '../hooks/useProfile';

type Tab = 'login' | 'register';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (profile: UserProfile) => void;
  onLogin: (phone: string) => boolean;
  existingProfile: UserProfile | null;
};

export function CustomerAuthModal({ open, onClose, onSave, onLogin, existingProfile }: Props) {
  const [tab, setTab] = useState<Tab>(existingProfile ? 'login' : 'register');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginError, setLoginError] = useState('');
  const [reg, setReg] = useState<UserProfile>({
    name: '',
    phone: '',
    address: '',
    birthday: '',
    zone_id: '',
  });
  const [regError, setRegError] = useState('');
  const [done, setDone] = useState(false);

  if (!open) return null;

  // ── Login handler ────────────────────────────────────────────────────────────
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onLogin(loginPhone);
    if (!ok) {
      setLoginError('No encontramos una cuenta con ese número. ¿Quieres registrarte?');
    } else {
      setDone(true);
      setTimeout(onClose, 1200);
    }
  };

  // ── Register handler ─────────────────────────────────────────────────────────
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reg.name.trim() || !reg.phone.trim() || !reg.address.trim() || !reg.birthday || !reg.zone_id) {
      setRegError('Por favor completa todos los campos');
      return;
    }
    onSave(reg);
    setDone(true);
    setTimeout(onClose, 1200);
  };

  // ── Birthday input helper ────────────────────────────────────────────────────
  // Store as "MM-DD", display with a full date (year 2000 for the picker)
  const birthdayValue = reg.birthday ? '2000-' + reg.birthday : '';
  const handleBirthdayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parts = e.target.value.split('-');
    if (parts.length === 3) setReg(r => ({ ...r, birthday: parts[1] + '-' + parts[2] }));
    else if (!e.target.value) setReg(r => ({ ...r, birthday: '' }));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-[slideUp_0.2s_ease-out] sm:animate-none">
          {/* Handle (mobile) */}
          <div className="sm:hidden pt-3 pb-1 flex justify-center">
            <div className="w-10 h-1.5 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="px-6 pt-4 pb-0 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-900">
                {done ? '¡Listo!' : tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </h2>
              {!done && (
                <p className="text-sm text-gray-400 mt-0.5">
                  {tab === 'login'
                    ? 'Ingresa con tu número de teléfono'
                    : 'Completa tus datos para pedidos más rápidos'}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-90"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Success state */}
          {done ? (
            <div className="flex flex-col items-center py-10 px-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-9 h-9 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-gray-900">
                {tab === 'login' ? '¡Bienvenido de vuelta!' : '¡Cuenta creada!'}
              </p>
              <p className="text-sm text-gray-400 mt-1 text-center">
                Tu información se autocompletará en el checkout
              </p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="px-6 pt-4 pb-0">
                <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                  {(['login', 'register'] as Tab[]).map(t => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setLoginError(''); setRegError(''); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all ${
                        tab === t
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {t === 'login'
                        ? <><LogIn className="w-3.5 h-3.5" />Ingresar</>
                        : <><UserPlus className="w-3.5 h-3.5" />Registrarse</>
                      }
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-6 py-5">
                {/* ── LOGIN ───────────────────────────────── */}
                {tab === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                        Número de teléfono
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                          type="tel"
                          required
                          value={loginPhone}
                          onChange={e => { setLoginPhone(e.target.value); setLoginError(''); }}
                          placeholder="Ej. 0414-1234567"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-orange-300 focus:bg-white transition-all"
                          autoFocus
                        />
                      </div>
                    </div>

                    {loginError && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600 leading-snug">{loginError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm active:scale-[0.98] transition-all shadow-md shadow-orange-500/25 flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      Ingresar
                    </button>

                    <button
                      type="button"
                      onClick={() => setTab('register')}
                      className="w-full py-2.5 text-sm text-orange-500 font-semibold hover:text-orange-600 flex items-center justify-center gap-1 transition-colors"
                    >
                      ¿No tienes cuenta? Regístrate gratis
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}

                {/* ── REGISTER ────────────────────────────── */}
                {tab === 'register' && (
                  <form onSubmit={handleRegister} className="space-y-3">
                    {/* Name */}
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="text"
                        required
                        value={reg.name}
                        onChange={e => setReg(r => ({ ...r, name: e.target.value }))}
                        placeholder="Nombre completo"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-orange-300 transition-all"
                        autoFocus
                      />
                    </div>

                    {/* Phone */}
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="tel"
                        required
                        value={reg.phone}
                        onChange={e => setReg(r => ({ ...r, phone: e.target.value }))}
                        placeholder="Teléfono (Ej. 0414-1234567)"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-orange-300 transition-all"
                      />
                    </div>

                    {/* Address */}
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-300" />
                      <textarea
                        required
                        rows={2}
                        value={reg.address}
                        onChange={e => setReg(r => ({ ...r, address: e.target.value }))}
                        placeholder="Dirección principal de despacho"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-orange-300 transition-all resize-none leading-relaxed"
                      />
                    </div>

                    {/* Zone selector */}
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                      <select
                        required
                        value={reg.zone_id}
                        onChange={e => setReg(r => ({ ...r, zone_id: e.target.value }))}
                        className="w-full pl-10 pr-9 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-orange-300 transition-all appearance-none bg-white"
                      >
                        <option value="" disabled>Selecciona tu sector / zona</option>
                        {(['cerca', 'media', 'lejos'] as const).map(tier => (
                          <optgroup key={tier} label={ZONE_TIER_LABEL[tier] + ' — $' + DELIVERY_ZONES.find(z => z.tier === tier)?.fee.toFixed(2)}>
                            {DELIVERY_ZONES.filter(z => z.tier === tier).map(z => (
                              <option key={z.id} value={z.id}>{z.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                    </div>

                    {/* Birthday */}
                    <div>
                      <div className="relative">
                        <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                        <input
                          type="date"
                          required
                          value={birthdayValue}
                          onChange={handleBirthdayChange}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-orange-300 transition-all"
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 ml-1">
                        Fecha de cumpleaños — te enviaremos un regalo especial ese día
                      </p>
                    </div>

                    {regError && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <p className="text-xs text-red-600">{regError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm active:scale-[0.98] transition-all shadow-md shadow-orange-500/25 flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Crear mi cuenta
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

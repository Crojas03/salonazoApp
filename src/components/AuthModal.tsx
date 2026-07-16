import { useState, useEffect, useRef } from 'react';
import { X, Phone, User, ArrowLeft, Loader2, CheckCircle2, ChevronRight, Lock, KeyRound, MapPin } from 'lucide-react';
import type { UserProfile } from '../hooks/useProfile';
import { DELIVERY_ZONES } from '../lib/supabase';
import { formatPhone, isPhoneComplete, isValidPin } from '../lib/phone';

type Mode = 'welcome' | 'login' | 'register';

type P = {
  open: boolean;
  onClose: () => void;
  onLogin: (p: UserProfile) => void;
  register: (phone: string, name: string, pin: string, zone_id?: string, address?: string) => Promise<{ ok: boolean; error?: string }>;
  login: (phone: string, pin: string) => Promise<{ ok: boolean; error?: string }>;
};

export function AuthModal({ open, onClose, onLogin, register, login }: P) {
  const [mode, setMode] = useState<Mode>('welcome');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMode('welcome'); setPhone(''); setName(''); setPin(''); setZoneId(''); setAddress('');
      setError(''); setLoading(false); setSuccess(false);
    }
  }, [open]);

  useEffect(() => { if (mode === 'login' && phoneRef.current) setTimeout(() => phoneRef.current?.focus(), 100); }, [mode]);

  if (!open) return null;

  const handlePhoneChange = (v: string) => { setPhone(formatPhone(v)); setError(''); };
  const handlePinChange = (v: string) => { setPin(v.replace(/\D/g, '').slice(0, 4)); setError(''); };

  const handleLogin = async () => {
    setError('');
    if (!isPhoneComplete(phone)) { setError('Teléfono incompleto (04XX-XXXXXXX)'); return; }
    if (!isValidPin(pin)) { setError('PIN debe ser 4 dígitos'); return; }
    setLoading(true);
    const r = await login(phone, pin);
    setLoading(false);
    if (r.ok) {
      setSuccess(true);
      setTimeout(() => {
        const s = localStorage.getItem('salonazo-profile-v2');
        if (s) onLogin(JSON.parse(s));
      }, 600);
    } else {
      setError(r.error ?? 'Error');
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!name.trim()) { setError('Ingresa tu nombre'); return; }
    if (!isPhoneComplete(phone)) { setError('Teléfono incompleto (04XX-XXXXXXX)'); return; }
    if (!isValidPin(pin)) { setError('PIN debe ser 4 dígitos'); return; }
    setLoading(true);
    const r = await register(phone, name.trim(), pin, zoneId || undefined, address || undefined);
    setLoading(false);
    if (r.ok) {
      setSuccess(true);
      setTimeout(() => {
        const s = localStorage.getItem('salonazo-profile-v2');
        if (s) onLogin(JSON.parse(s));
      }, 600);
    } else {
      setError(r.error ?? 'Error');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl animate-slide-up flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="pt-3 pb-1 flex justify-center"><div className="w-10 h-1.5 rounded-full bg-gray-200" /></div>
        <div className="px-5 py-3 flex items-center justify-between">
          {mode !== 'welcome' && !success ? (
            <button onClick={() => { setMode('welcome'); setError(''); }} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center active:scale-90">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          ) : <div className="w-9" />}
          <h2 className="text-lg font-bold text-gray-900 flex-1 text-center">
            {success ? '¡Listo!' : mode === 'welcome' ? 'Mi Cuenta' : mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center active:scale-90">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5 animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-green-500" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">¡Bienvenido!</h3>
            </div>
          ) : mode === 'welcome' ? (
            <div className="space-y-4 pt-4">
              <div className="flex flex-col items-center text-center pb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-3">
                  <span className="text-white font-black text-2xl">S</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">El Salonazo</h3>
                <p className="text-sm text-gray-400 mt-1">Inicia sesión para guardar tus pedidos</p>
              </div>
              <button onClick={() => setMode('login')} className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-bold text-sm active:scale-[0.98] shadow-lg flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" /> Iniciar Sesión
              </button>
              <button onClick={() => setMode('register')} className="w-full py-3.5 rounded-xl bg-gray-50 text-gray-900 font-bold text-sm active:scale-[0.98] border border-gray-100 flex items-center justify-center gap-2">
                <User className="w-4 h-4" /> Crear Cuenta
              </button>
            </div>
          ) : mode === 'login' ? (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-400 text-center pb-2">Ingresa tu teléfono y PIN</p>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    ref={phoneRef}
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="0412-0850790"
                    maxLength={12}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm font-mono tracking-wide focus:outline-none focus:border-orange-300 focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">PIN (4 dígitos)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={e => handlePinChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="••••"
                    maxLength={4}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm tracking-[0.5em] text-center focus:outline-none focus:border-orange-300 focus:bg-white"
                  />
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-100 rounded-xl p-3"><p className="text-xs text-red-600">{error}</p></div>}
              <button onClick={handleLogin} disabled={loading || !isPhoneComplete(phone) || !isValidPin(pin)} className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-bold text-sm active:scale-[0.98] shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continuar <ChevronRight className="w-4 h-4" /></>}
              </button>
              <button onClick={() => { setMode('register'); setError(''); setPin(''); }} className="w-full text-center text-xs text-gray-400">
                ¿No tienes cuenta? <span className="text-orange-500 font-bold">Regístrate</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-400 text-center pb-2">Crea tu cuenta</p>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Nombre</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); setError(''); }}
                    placeholder="Juan Pérez"
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:border-orange-300 focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="0412-0850790"
                    maxLength={12}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm font-mono tracking-wide focus:outline-none focus:border-orange-300 focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">PIN (4 dígitos)</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={e => handlePinChange(e.target.value)}
                    placeholder="••••"
                    maxLength={4}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm tracking-[0.5em] text-center focus:outline-none focus:border-orange-300 focus:bg-white"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 ml-1">Usa 4 dígitos numéricos</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Zona (opcional)</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <select value={zoneId} onChange={e => setZoneId(e.target.value)} className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:border-orange-300 appearance-none">
                    <option value="">Selecciona</option>
                    {DELIVERY_ZONES.map(z => <option key={z.id} value={z.id}>{z.name} — ${z.fee.toFixed(2)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Dirección (opcional)</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Torre A, Apto 3B"
                  className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:border-orange-300 focus:bg-white"
                />
              </div>
              {error && <div className="bg-red-50 border border-red-100 rounded-xl p-3"><p className="text-xs text-red-600">{error}</p></div>}
              <button onClick={handleRegister} disabled={loading || !name.trim() || !isPhoneComplete(phone) || !isValidPin(pin)} className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-bold text-sm active:scale-[0.98] shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Crear Cuenta <CheckCircle2 className="w-4 h-4" /></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

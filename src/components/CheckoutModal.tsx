import { useState, lazy, Suspense } from 'react';
const MapPicker = lazy(() => import('./MapPicker').then(m => ({ default: m.MapPicker })));
import {
  X,
  ArrowLeft,
  Smartphone,
  Check,
  Loader2,
  MapPin,
  Phone,
  User,
  Landmark,
  Hash,
  ImagePlus,
  ChevronDown,
  Building2,
  Clock,
  AlertTriangle,
  Navigation,
  Bookmark,
  CalendarClock,
} from 'lucide-react';
import type { CartItem } from '../lib/supabase';
import type { UserProfile } from '../hooks/useProfile';
import { getProfileZone } from '../hooks/useProfile';
import { DELIVERY_ZONES, ZONE_TIER_LABEL, gpsDeliveryFee, haversineKm, RESTAURANT_COORDS, BCV_RATE } from '../lib/supabase';
import { supabase } from '../lib/supabase';


// Kitchen hours: 11:30 – 22:30 local time
function isKitchenOpen(): boolean {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const total = h * 60 + m;
  return total >= 11 * 60 + 30 && total < 22 * 60 + 30;
}

function nextOpenTime(): string {
  return '11:30 AM';
}

type Props = {
  open: boolean;
  items: CartItem[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  deliveryZone: string | null;
  notas: string;
  onZoneChange: (zoneId: string, fee: number, name: string) => void;
  onClose: () => void;
  onBack: () => void;
  onSuccess: (orderId: string) => void;
  profile: UserProfile | null;
};

type SavedAddress = { label: string; lat: number; lng: number; referencia: string };
const SAVED_ADDR_KEY = 'salonazo_saved_addresses';
function loadSavedAddresses(): SavedAddress[] {
  try { return JSON.parse(localStorage.getItem(SAVED_ADDR_KEY) ?? '[]'); } catch { return []; }
}
function saveAddress(addr: SavedAddress) {
  const list = loadSavedAddresses().filter(a => a.label !== addr.label);
  localStorage.setItem(SAVED_ADDR_KEY, JSON.stringify([addr, ...list].slice(0, 5)));
}

type FormState = {
  name: string;
  phone: string;
  referencia: string;
  payment_method: string;
  payment_reference: string;
};

type Status = 'idle' | 'submitting' | 'success' | 'error';

const BANK_DATA = {
  bank: 'Banco de Venezuela',
  rif: 'J-12345678-9',
  phone: '0414-1234567',
  account: '0102-0123-45-6789012345',
};

const ZELLE_DATA = {
  email: 'pagos.salonazo@gmail.com',
  holder: 'El Salonazo Restaurant LLC',
};

export function CheckoutModal({
  open,
  items,
  subtotal,
  discount,
  couponCode,
  deliveryZone,
  notas,
  onZoneChange,
  onClose,
  onBack,
  onSuccess,
  profile,
}: Props) {
  const [form, setForm] = useState<FormState>({
    name: profile?.name ?? '',
    phone: profile?.phone ?? '',
    referencia: '',
    payment_method: 'pago_movil',
    payment_reference: '',
  });
  const [saveAddr, setSaveAddr] = useState(false);
  const [addrLabel, setAddrLabel] = useState('Casa');
  const [savedAddresses] = useState<SavedAddress[]>(loadSavedAddresses);
  const [scheduledType, setScheduledType] = useState<'inmediata' | 'programada'>('inmediata');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  if (!open) return null;

  const selectedZone = DELIVERY_ZONES.find((z) => z.id === deliveryZone);

  // GPS fee takes priority over zone fee
  const activeDeliveryFee = gpsCoords
    ? gpsDeliveryFee(gpsCoords.lat, gpsCoords.lng)
    : (selectedZone?.fee ?? 0);
  const activeDeliveryLabel = gpsCoords
    ? (() => {
        const km = haversineKm(RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng, gpsCoords.lat, gpsCoords.lng);
        return `GPS · ${km.toFixed(1)} km`;
      })()
    : (selectedZone?.name ?? '');

  const computedTotal = Math.max(0, subtotal - discount + activeDeliveryFee);

  const handleGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Tu navegador no soporta geolocalización');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
        // Notify parent with GPS fee so cart total stays in sync
        onZoneChange('gps', gpsDeliveryFee(pos.coords.latitude, pos.coords.longitude), 'GPS');
      },
      () => {
        setGpsError('No se pudo obtener tu ubicación. Verifica los permisos del navegador.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setStatus('submitting');
    setErrorMsg('');

    try {
      const orderItems = items.map((i) => ({
        product_id: i.product.id,
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
      }));

      const { data: inserted, error } = await supabase.from('orders').insert({
        customer_name: form.name,
        customer_phone: form.phone,
        delivery_address: form.referencia,
        delivery_zone: activeDeliveryLabel || 'GPS Location',
        payment_method: form.payment_method,
        payment_reference: form.payment_reference,
        payment_screenshot_url: screenshot,
        items: orderItems,
        subtotal,
        delivery_fee: activeDeliveryFee,
        total: computedTotal,
        notas: notas.trim() || null,
        scheduled_for: scheduledType === 'programada' && scheduledDate && scheduledTime
          ? `${scheduledDate}T${scheduledTime}`
          : null,
        status: 'recibido',
      }).select('id').single();

      if (error) console.error('Order insert error:', error);

      setStatus('success');
      setTimeout(() => {
        if (saveAddr && gpsCoords) {
          saveAddress({ label: addrLabel, lat: gpsCoords.lat, lng: gpsCoords.lng, referencia: form.referencia });
        }
        onSuccess((inserted as {id:string}).id);
        setStatus('idle');
        setForm({ name: profile?.name ?? '', phone: profile?.phone ?? '', referencia: '', payment_method: 'pago_movil', payment_reference: '' });
        setScreenshot(null);
      }, 1800);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error al procesar el pedido');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3.5 flex items-center gap-3 border-b border-gray-50">
        {status === 'success' ? (
          <div className="w-9" />
        ) : (
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center active:scale-90 transition-all"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <h2 className="text-lg font-bold text-gray-900 flex-1">Checkout</h2>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center active:scale-90 transition-all"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {status === 'success' ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5 animate-[bounce_1s_ease-in-out_infinite]">
            <Check className="w-10 h-10 text-green-500" strokeWidth={3} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">¡Pedido confirmado!</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Tu pedido ha sido registrado con estado "recibido". El restaurante lo preparará en breve.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
            {/* Customer info */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Datos de entrega
              </h3>

              {profile ? (
                /* ── Logged-in: profile card ─────────────────────── */
                <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-xl p-3.5">
                  <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{profile.name}</p>
                    <p className="text-xs text-gray-500">{profile.phone}</p>
                  </div>
                  <span className="text-[10px] font-bold text-orange-600 bg-white border border-orange-200 px-2 py-0.5 rounded-full">
                    Verificado
                  </span>
                </div>
              ) : (
                /* ── Guest: full name + phone fields ─────────────── */
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Nombre completo</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="Ej. Juan Pérez"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-orange-300 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Teléfono</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="Ej. 0414-1234567"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-orange-300 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Zone + GPS selector */}
              {(() => {
                const profileZone = getProfileZone(profile);
                if (profileZone && !deliveryZone) {
                  onZoneChange(profileZone.id, profileZone.fee, profileZone.name);
                }
                return (
                  <div className="space-y-3">
                    {profileZone && (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-gray-900">{profileZone.name}</p>
                            <p className="text-xs text-blue-500">Tarifa base: ${profileZone.fee.toFixed(2)}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 bg-white border border-blue-200 px-2 py-0.5 rounded-full">Tu zona</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleGps}
                      disabled={gpsLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-orange-200 bg-orange-50 text-orange-600 text-sm font-bold hover:bg-orange-100 active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                      {gpsLoading ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual (GPS)'}
                    </button>

                    {gpsCoords && (
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                        <Navigation className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-gray-900">{activeDeliveryLabel}</p>
                          <p className="text-xs text-emerald-600">Tarifa calculada: ${activeDeliveryFee.toFixed(2)}</p>
                        </div>
                      </div>
                    )}
                    {gpsError && <p className="text-xs text-red-500">{gpsError}</p>}

                    {!profileZone && (
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-1.5 block">O elige tu zona manualmente</label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                          <select
                            value={deliveryZone ?? ''}
                            onChange={e => {
                              setGpsCoords(null);
                              const zone = DELIVERY_ZONES.find(z => z.id === e.target.value);
                              if (zone) onZoneChange(zone.id, zone.fee, zone.name);
                            }}
                            className="w-full pl-10 pr-10 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900 focus:outline-none focus:border-orange-300 focus:bg-white transition-all appearance-none"
                          >
                            <option value="">Selecciona tu zona</option>
                            {(['cerca', 'media', 'lejos'] as const).map(tier => (
                              <optgroup key={tier} label={ZONE_TIER_LABEL[tier]}>
                                {DELIVERY_ZONES.filter(z => z.tier === tier).map(z => (
                                  <option key={z.id} value={z.id}>{z.name} — ${z.fee.toFixed(2)}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Map picker */}
              {gpsCoords && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400">Ajusta tu pin en el mapa</p>
                  <Suspense fallback={<div className="w-full h-48 rounded-xl bg-gray-100 animate-pulse" />}>
                    <MapPicker
                      lat={gpsCoords.lat}
                      lng={gpsCoords.lng}
                      onChange={(lat, lng) => {
                        setGpsCoords({ lat, lng });
                        onZoneChange('gps', gpsDeliveryFee(lat, lng), 'GPS');
                      }}
                    />
                  </Suspense>
                </div>
              )}

              {/* Saved addresses */}
              {savedAddresses.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400">Direcciones guardadas</p>
                  <div className="flex flex-wrap gap-2">
                    {savedAddresses.map(a => (
                      <button
                        key={a.label}
                        type="button"
                        onClick={() => {
                          setGpsCoords({ lat: a.lat, lng: a.lng });
                          setForm(f => ({ ...f, referencia: a.referencia }));
                          onZoneChange('gps', gpsDeliveryFee(a.lat, a.lng), 'GPS');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold hover:bg-orange-100 transition-all"
                      >
                        <Bookmark className="w-3 h-3" />{a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Referencia field */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">
                  Punto de Referencia / Casa / Apto
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-300" />
                  <textarea
                    required
                    rows={2}
                    value={form.referencia}
                    onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                    placeholder="Ej: Torre A piso 3, frente a la farmacia..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-orange-300 focus:bg-white transition-all resize-none"
                  />
                </div>
              </div>

              {/* Save address checkbox */}
              {gpsCoords && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAddr}
                      onChange={e => setSaveAddr(e.target.checked)}
                      className="w-4 h-4 accent-orange-500 rounded"
                    />
                    <span className="text-xs font-semibold text-gray-600">Guardar esta ubicación para futuros pedidos</span>
                  </label>
                  {saveAddr && (
                    <div className="flex gap-2">
                      {['Casa', 'Trabajo', 'Otro'].map(l => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setAddrLabel(l)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${addrLabel === l ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scheduled delivery */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-orange-400" /> Tipo de entrega
              </h3>
              <div className="flex gap-2">
                {(['inmediata', 'programada'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setScheduledType(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${scheduledType === t ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
                  >
                    {t === 'inmediata' ? 'Entrega Inmediata' : 'Programar Pedido'}
                  </button>
                ))}
              </div>
              {scheduledType === 'programada' && (
                <div className="flex gap-2">
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900 focus:outline-none focus:border-orange-300"
                  />
                  <input
                    type="time"
                    required
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900 focus:outline-none focus:border-orange-300"
                  />
                </div>
              )}
            </div>

            {/* Payment method */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Método de pago
              </h3>

              {/* ── Payment option cards ────────────────────────── */}
              {(
                [
                  { id: 'pago_movil',    label: 'Pago Móvil',               sub: 'Transferencia bancaria Bs.',       Icon: Smartphone },
                  { id: 'efectivo_bs',  label: 'Efectivo Bs.',              sub: 'Paga en bolívares al recibir',     Icon: Building2  },
                  { id: 'transferencia',label: 'Transferencia Bancaria',    sub: 'Depósito bancario en Bs.',          Icon: Landmark   },
                  { id: 'paypal',       label: 'PayPal',                    sub: 'Pago en dólares por PayPal',       Icon: Landmark   },
                  { id: 'debito_inter', label: 'Tarjeta Débito Internacional', sub: 'Débito en USD',                Icon: Landmark   },
                  { id: 'efectivo_usd', label: 'Efectivo $',                sub: 'Paga en dólares al recibir',      Icon: Building2  },
                  { id: 'binance',      label: 'Binance',                   sub: 'Pago en crypto USDT',              Icon: Smartphone },
                ] as const
              ).map(({ id, label, sub, Icon }) => (
                <label
                  key={id}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] ${
                    form.payment_method === id
                      ? 'border-orange-500 bg-orange-50/50'
                      : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                    form.payment_method === id ? 'bg-orange-500' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${form.payment_method === id ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    form.payment_method === id ? 'border-orange-500 bg-orange-500' : 'border-gray-200'
                  }`}>
                    {form.payment_method === id && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  <input
                    type="radio"
                    name="payment_method"
                    value={id}
                    checked={form.payment_method === id}
                    onChange={e => setForm({ ...form, payment_method: e.target.value, payment_reference: '' })}
                    className="sr-only"
                  />
                </label>
              ))}

              {/* ── Pago Móvil details ──────────────────────────── */}
              {form.payment_method === 'pago_movil' && (
                <div className="space-y-3 animate-[slideUp_0.2s_ease-out]">
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Datos para transferir</p>
                    </div>
                    {[
                      { icon: Landmark, label: 'Banco',    val: BANK_DATA.bank    },
                      { icon: Hash,     label: 'RIF',      val: BANK_DATA.rif     },
                      { icon: Phone,    label: 'Teléfono', val: BANK_DATA.phone   },
                      { icon: Hash,     label: 'Cuenta',   val: BANK_DATA.account },
                    ].map(({ icon: Icon2, label, val }) => (
                      <div key={label} className="flex items-center gap-2.5">
                        <Icon2 className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <span className="text-xs text-gray-400">{label}</span>
                        <span className="text-sm font-semibold text-gray-900 ml-auto">{val}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Número de referencia *</label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="text"
                        value={form.payment_reference}
                        onChange={e => setForm({ ...form, payment_reference: e.target.value })}
                        placeholder="Ej. 123456789"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-orange-300 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Captura del pago (opcional)</label>
                    {screenshot ? (
                      <div className="relative rounded-xl overflow-hidden border border-gray-100">
                        <img src={screenshot} alt="Captura" className="w-full h-40 object-cover" />
                        <button type="button" onClick={() => setScreenshot(null)}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center active:scale-90 transition-all" aria-label="Quitar">
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all active:scale-[0.98]">
                        <ImagePlus className="w-7 h-7 text-gray-300" />
                        <span className="text-xs font-medium text-gray-400">Toca para adjuntar captura</span>
                        <input type="file" accept="image/*" onChange={handleFile} className="sr-only" />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* (reference input lives inside pago_movil block above) */}
              {/* ── UNUSED BLOCK (was 'zelle') ── */}
              {false && (
                <div className="space-y-3 animate-[slideUp_0.2s_ease-out]">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <Landmark className="w-4 h-4 text-blue-400" />
                      <p className="text-xs font-bold text-blue-500 uppercase tracking-wide">Datos Zelle</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Hash className="w-4 h-4 text-blue-200 flex-shrink-0" />
                      <span className="text-xs text-blue-400">Titular</span>
                      <span className="text-sm font-semibold text-blue-900 ml-auto">{ZELLE_DATA.holder}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-blue-200 flex-shrink-0" />
                      <span className="text-xs text-blue-400">Email</span>
                      <span className="text-sm font-semibold text-blue-900 ml-auto font-mono">{ZELLE_DATA.email}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Últimos 4 dígitos de la transferencia *</label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="text"
                        maxLength={4}
                        value={form.payment_reference}
                        onChange={e => setForm({ ...form, payment_reference: e.target.value.replace(/\D/g, '') })}
                        placeholder="Ej. 4782"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-blue-300 focus:bg-white transition-all font-mono tracking-widest"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(form.payment_method === 'efectivo_bs' || form.payment_method === 'efectivo_usd') && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Paga al recibir tu pedido</p>
                    <p className="text-xs text-emerald-600 mt-1">
                      {form.payment_method === 'efectivo_bs'
                        ? <><strong>Bs. {(computedTotal * BCV_RATE).toFixed(2)}</strong> ≈ ${computedTotal.toFixed(2)}</>
                        : <><strong>${computedTotal.toFixed(2)}</strong> en efectivo</>}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Order summary */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Resumen del pedido</h3>
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-xs">
                  <span className="text-gray-500">
                    {item.quantity}x {item.product.name}
                  </span>
                  <span className="font-semibold text-gray-600">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-gray-100 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="font-semibold text-gray-600">${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600 font-medium">Descuento {couponCode ? `(${couponCode})` : ''}</span>
                    <span className="font-bold text-emerald-600">-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">
                    Envío{activeDeliveryLabel ? ` (${activeDeliveryLabel})` : ''}
                  </span>
                  <span className="font-semibold text-gray-600">
                    {activeDeliveryFee > 0 ? `${activeDeliveryFee.toFixed(2)}` : '—'}
                  </span>
                </div>
                {(() => {
                  const bsFirst = ['pago_movil', 'efectivo_bs', 'transferencia'].includes(form.payment_method);
                  return (
                    <div className="flex justify-between pt-1.5 items-end">
                      <span className="font-bold text-gray-900 text-sm">Total</span>
                      <div className="text-right">
                        {bsFirst ? (
                          <>
                            <p className="font-black text-orange-500 text-2xl leading-none">Bs. {(computedTotal * BCV_RATE).toFixed(2)}</p>
                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">${computedTotal.toFixed(2)} USD</p>
                          </>
                        ) : (
                          <>
                            <p className="font-black text-orange-500 text-2xl leading-none">${computedTotal.toFixed(2)}</p>
                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Bs. {(computedTotal * BCV_RATE).toFixed(2)}</p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {status === 'error' && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 font-medium">
                {errorMsg}
              </div>
            )}

            {/* Business hours gate */}
            {!isKitchenOpen() && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Cocina cerrada por ahora</p>
                  <p className="text-xs text-amber-600 mt-0.5 leading-snug">
                    Nuestro servicio está disponible de <strong>11:30 AM a 10:30 PM</strong>.
                    Vuelve a partir de las <strong>{nextOpenTime()}</strong>.
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'submitting' || items.length === 0 || !isKitchenOpen()}
              className="w-full py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-base active:scale-[0.98] transition-all shadow-lg disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : !isKitchenOpen() ? (
                <>
                  <Clock className="w-5 h-5" />
                  Cocina cerrada
                </>
              ) : (
                `Confirmar pedido · $${computedTotal.toFixed(2)}`
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

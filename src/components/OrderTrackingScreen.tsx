import { useEffect, useRef, useState } from 'react';
import {
  Clock, ChefHat, Bike, CheckCircle2,
  Package, ChevronLeft, RotateCcw, Phone,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Order } from '../lib/supabase';

// ─── Status pipeline ─────────────────────────────────────────────────────────
type TrackStep = {
  key: string[];
  label: string;
  sublabel: string;
  Icon: typeof Clock;
  color: string;
  bg: string;
  ring: string;
};

const STEPS: TrackStep[] = [
  {
    key: ['recibido'],
    label: 'Pedido Recibido',
    sublabel: 'Validando tu pago',
    Icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    ring: 'ring-amber-400',
  },
  {
    key: ['en_cocina'],
    label: 'En Cocina',
    sublabel: 'Preparando tu pedido',
    Icon: ChefHat,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    ring: 'ring-orange-400',
  },
  {
    key: ['listo_despacho', 'en_camino'],
    label: 'En Camino',
    sublabel: 'Tu pedido va en camino',
    Icon: Bike,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    ring: 'ring-blue-400',
  },
  {
    key: ['entregado'],
    label: 'Entregado',
    sublabel: '¡Disfruta tu pedido!',
    Icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-400',
  },
];

function getActiveStep(status: string): number {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (STEPS[i].key.includes(status)) return i;
  }
  return 0;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(n: number): string {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Component ───────────────────────────────────────────────────────────────
const LS_KEY = 'salonazo-active-order';

type Props = {
  orderId?: string | null;
  onBack: () => void;
};

export function OrderTrackingScreen({ orderId: propOrderId, onBack }: Props) {
  // Resolve from prop first, then localStorage — survives React state loss on refresh
  const orderId = propOrderId ?? (() => {
    try { return localStorage.getItem(LS_KEY); } catch { return null; }
  })();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initial load
  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
      .then(({ data }) => {
        if (data) setOrder(data as Order);
        setLoading(false);
      });
  }, [orderId]);

  // Realtime subscription — re-attaches whenever orderId changes
  useEffect(() => {
    if (!orderId) return;
    const ch = supabase
      .channel('order-track-' + orderId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: 'id=eq.' + orderId,
        },
        (payload) => {
          setOrder(payload.new as Order);
        }
      )
      .subscribe();

    channelRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, [orderId]);

  // Polling fallback — every 5 s, sync from DB in case Realtime misses an event
  useEffect(() => {
    if (!orderId) return;
    const poll = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (data) {
        setOrder(prev =>
          !prev || prev.status !== (data as Order).status ? (data as Order) : prev
        );
      }
    };
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Package className="w-10 h-10 text-orange-300 animate-bounce" />
          <p className="text-sm text-gray-400">Cargando seguimiento...</p>
        </div>
      </div>
    );
  }

  if (!orderId || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center bg-white gap-4">
        <Package className="w-12 h-12 text-gray-200" />
        <div>
          <p className="font-semibold text-gray-700 mb-1">Sin pedidos activos</p>
          <p className="text-sm text-gray-400">Cuando realices un pedido podrás seguirlo aquí.</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 mt-2"
        >
          <RotateCcw className="w-4 h-4" />
          Ver el menú
        </button>
      </div>
    );
  }

  const activeStep = getActiveStep(order.status);
  const isDelivered = order.status === 'entregado';
  const phoneDigits = order.customer_phone?.replace(/\D/g, '') ?? '';

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center active:scale-90 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <p className="font-bold text-gray-900 text-sm">Seguimiento de Pedido</p>
          <p className="text-[11px] text-gray-400 font-mono">{order.id.slice(0, 8).toUpperCase()} · {formatTime(order.created_at)}</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Stepper */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between relative">
            {/* Connector line */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-100" />
            <div
              className="absolute top-5 left-5 h-0.5 bg-emerald-400 transition-all duration-700"
              style={{ width: `${(activeStep / (STEPS.length - 1)) * 100}%` }}
            />

            {STEPS.map((step, i) => {
              const done = i < activeStep;
              const active = i === activeStep;
              const Icon = step.Icon;
              return (
                <div key={step.label} className="flex flex-col items-center gap-2 z-10 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ring-2 transition-all duration-500 ${
                      active
                        ? `${step.bg} ${step.ring} ring-offset-2 scale-110`
                        : done
                          ? 'bg-emerald-50 ring-emerald-300'
                          : 'bg-gray-50 ring-gray-200'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors duration-300 ${
                        active ? step.color : done ? 'text-emerald-500' : 'text-gray-300'
                      }`}
                    />
                  </div>
                  <div className="text-center">
                    <p className={`text-[10px] font-bold leading-tight ${
                      active ? 'text-gray-900' : done ? 'text-emerald-600' : 'text-gray-300'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active step description */}
          <div className={`mt-5 rounded-xl px-4 py-3 ${STEPS[activeStep].bg}`}>
            <p className={`text-sm font-bold ${STEPS[activeStep].color}`}>
              {STEPS[activeStep].label}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{STEPS[activeStep].sublabel}</p>
          </div>
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tu pedido</p>
          {(order.items as Array<{ name: string; quantity: number; price: number }>).map((item, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <span className="text-gray-700">
                <span className="font-bold text-gray-900">{item.quantity}×</span> {item.name}
              </span>
              <span className="font-semibold text-gray-800">
                ${formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
          <div className="border-t border-gray-50 pt-2 flex justify-between text-sm font-bold">
            <span className="text-gray-700">Total</span>
            <span className="text-gray-900">${formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Delivery info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Entrega</p>
          <p className="text-sm text-gray-700">{order.delivery_address}</p>
          <p className="text-xs text-gray-400">{order.delivery_zone}</p>
        </div>

        {/* Delivered celebration */}
        {isDelivered && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="font-bold text-emerald-800">¡Pedido entregado!</p>
            <p className="text-xs text-emerald-600">Gracias por tu compra. ¡Buen provecho!</p>
            <button
              onClick={onBack}
              className="mt-2 flex items-center gap-2 mx-auto text-sm font-bold text-emerald-700 hover:text-emerald-800"
            >
              <RotateCcw className="w-4 h-4" />
              Hacer otro pedido
            </button>
          </div>
        )}

        {/* Contact */}
        {phoneDigits && (
          <a
            href={`tel:${phoneDigits}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            <Phone className="w-4 h-4" />
            Llamar al restaurante
          </a>
        )}
      </div>
    </div>
  );
}

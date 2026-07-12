import { useState } from 'react';
import {
  Megaphone, Send, CheckCircle2, AlertCircle, Loader2,
  Bell, Clock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { DbNotification } from '../lib/supabase';

type SendStatus = 'idle' | 'sending' | 'sent' | 'error';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

const TEMPLATES = [
  { label: '2×1 Hamburguesas',   title: '¡2x1 en Hamburguesas solo por hoy! 🍔', message: 'Pide dos hamburguesas clásicas y paga solo una. Válido hoy hasta agotar existencias.' },
  { label: 'Oferta de fin de semana', title: '¡Descuentos de Fin de Semana! 🎉',   message: 'Hasta 30% OFF en platos seleccionados este fin de semana. ¡Aprovecha antes que se agoten!' },
  { label: 'Nuevo plato',        title: 'Nuevo plato en el menú 🌟',               message: 'Prueba nuestra nueva Parrilla Especial del Chef, exclusiva por tiempo limitado.' },
  { label: 'Combo familiar',     title: 'Combo Familiar a precio especial 👨‍👩‍👧‍👦',    message: 'Parrilla completa para 4 personas con envío gratis. Solo por esta semana.' },
];

export function MarketingPanel() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<SendStatus>('idle');
  const [sent, setSent] = useState<DbNotification[]>([]);
  const [loadingSent, setLoadingSent] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.title);
    setMessage(t.message);
    setStatus('idle');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setStatus('sending');
    const { error } = await supabase
      .from('notifications')
      .insert({ title: title.trim(), message: message.trim() });
    if (error) {
      setStatus('error');
      return;
    }
    setStatus('sent');
    setTitle('');
    setMessage('');
    setTimeout(() => setStatus('idle'), 3000);
  };

  const loadHistory = async () => {
    setLoadingSent(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setSent((data ?? []) as DbNotification[]);
    setLoadingSent(false);
    setShowHistory(true);
  };

  return (
    <div className="space-y-5">
      {/* Templates */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-bold text-gray-900">Plantillas rápidas</h2>
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => handleTemplate(t)}
              className="text-left px-3 py-2.5 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all active:scale-[0.98] group"
            >
              <p className="text-xs font-bold text-gray-700 group-hover:text-orange-600 leading-snug">{t.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Compose form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Send className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-bold text-gray-900">Enviar Notificación Masiva</h2>
        </div>

        <form onSubmit={handleSend} className="px-5 py-4 space-y-3">
          {/* Title */}
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              Título de la notificación
            </label>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Ej: ¡2x1 en Hamburguesas solo por hoy! 🍔"
              className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-orange-300 transition-colors"
            />
            <p className="text-right text-[10px] text-gray-300 mt-0.5">{title.length}/80</p>
          </div>

          {/* Message */}
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              Mensaje
            </label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={300}
              placeholder="Describe la promoción con detalle. Sé específico para generar más conversión."
              className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-orange-300 transition-colors resize-none leading-relaxed"
            />
            <p className="text-right text-[10px] text-gray-300 mt-0.5">{message.length}/300</p>
          </div>

          {/* Preview */}
          {(title || message) && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3.5">
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wide mb-1.5">Vista previa</p>
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 leading-snug">{title || '—'}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{message || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">Error al enviar. Intenta de nuevo.</p>
            </div>
          )}

          {status === 'sent' && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3.5 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-sm font-semibold text-green-700">¡Notificación enviada a todos los clientes!</p>
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'sending' || !title.trim() || !message.trim()}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm active:scale-[0.98] transition-all shadow-md shadow-orange-500/25 disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {status === 'sending'
              ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
              : <><Send className="w-4 h-4" />Enviar Notificación Masiva</>
            }
          </button>
        </form>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-bold text-gray-900">Historial de campañas</h2>
          </div>
          {!showHistory && (
            <button
              onClick={loadHistory}
              disabled={loadingSent}
              className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1 disabled:opacity-40"
            >
              {loadingSent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Ver historial
            </button>
          )}
        </div>

        {showHistory && (
          <div className="divide-y divide-gray-50">
            {sent.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">No hay campañas enviadas aún</p>
            ) : (
              sent.map(n => (
                <div key={n.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{n.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-snug">{n.message}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-300 font-medium flex-shrink-0 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDate(n.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

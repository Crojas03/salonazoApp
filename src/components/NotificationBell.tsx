import { useEffect, useRef, useState } from 'react';
import { Bell, X, Gift, Megaphone, PartyPopper } from 'lucide-react';
import type { AppNotification } from '../hooks/useNotifications';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

type Props = {
  notifications: AppNotification[];
  unreadCount: number;
  read: Set<string>;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
};

export function NotificationBell({
  notifications,
  unreadCount,
  read,
  onMarkAllRead,
  onMarkRead,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  const handleMarkAll = () => {
    onMarkAllRead();
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative w-11 h-11 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center"
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-orange-500' : 'text-gray-700'}`} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shadow-md shadow-red-500/40 animate-[popIn_0.2s_ease-out]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-14 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-[slideDown_0.18s_ease-out]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-gray-900">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-[11px] text-orange-500 font-semibold hover:text-orange-600 px-2 py-1 rounded-lg hover:bg-orange-50 transition-all"
                >
                  Marcar todas
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-all"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Bell className="w-8 h-8 text-gray-100 mb-2" />
                <p className="text-sm text-gray-400">No hay notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !read.has(n.id);
                return (
                  <button
                    key={n.id}
                    onClick={() => onMarkRead(n.id)}
                    className={`w-full text-left px-4 py-3.5 border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50 ${
                      isUnread ? 'bg-orange-50/40' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        n.isBirthday
                          ? 'bg-gradient-to-br from-pink-500 to-purple-500'
                          : 'bg-gradient-to-br from-orange-500 to-red-500'
                      }`}>
                        {n.isBirthday
                          ? <PartyPopper className="w-4 h-4 text-white" />
                          : <Megaphone className="w-4 h-4 text-white" />
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[13px] leading-snug font-bold ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
                            {n.title}
                          </p>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-gray-300 mt-1 font-medium">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Birthday coupon callout */}
                    {n.isBirthday && (
                      <div className="mt-2.5 flex items-center gap-2 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100 rounded-xl px-3 py-2">
                        <Gift className="w-4 h-4 text-pink-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-pink-600 uppercase tracking-wide">Tu cupón regalo</p>
                          <p className="font-mono text-sm font-black text-purple-700 tracking-widest">CUMPLESALONAZO</p>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

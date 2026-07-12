import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isBirthdayToday } from './useProfile';
import type { UserProfile } from './useProfile';

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  isBirthday?: boolean;
};

const READ_KEY = 'salonazo-read-notifs-v1';

function loadRead(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveRead(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

const BIRTHDAY_NOTIF_ID = 'birthday-special';

function buildBirthdayNotif(profile: UserProfile): AppNotification {
  return {
    id: BIRTHDAY_NOTIF_ID,
    title: `¡Feliz Cumpleaños, ${profile.name}! 🎉`,
    message:
      'Te regalamos el cupón CUMPLESALONAZO para un 15% de descuento en tu postre favorito. ¡Que lo disfrutes!',
    created_at: new Date().toISOString(),
    isBirthday: true,
  };
}

export function useNotifications(profile: UserProfile | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [read, setRead] = useState<Set<string>>(loadRead);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch existing + subscribe to new
  useEffect(() => {
    let mounted = true;

    async function fetchAll() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!mounted) return;

      const base: AppNotification[] = (data ?? []) as AppNotification[];

      // Prepend birthday notif if applicable
      if (profile && isBirthdayToday(profile.birthday)) {
        setNotifications([buildBirthdayNotif(profile), ...base]);
      } else {
        setNotifications(base);
      }
    }

    fetchAll();

    // Realtime: INSERT on notifications table
    const ch = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new as AppNotification;
          setNotifications((prev) => [n, ...prev]);
        }
      )
      .subscribe();

    channelRef.current = ch;
    return () => {
      mounted = false;
      ch.unsubscribe();
    };
  }, [profile?.birthday, profile?.name]);

  const markAllRead = () => {
    const ids = new Set(notifications.map((n) => n.id));
    saveRead(ids);
    setRead(ids);
  };

  const markRead = (id: string) => {
    const next = new Set(read).add(id);
    saveRead(next);
    setRead(next);
  };

  const unreadCount = notifications.filter((n) => !read.has(n.id)).length;

  return { notifications, unreadCount, read, markAllRead, markRead };
}

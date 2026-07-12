import { useEffect, useRef, useState } from 'react';
import { supabase, type Order } from '../lib/supabase';

export type OrderStatus = 'recibido' | 'en_cocina' | 'listo_despacho';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      try {
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        const initial = (data ?? []) as Order[];
        initial.forEach((o) => knownIds.current.add(o.id));
        setOrders(initial);
        isFirstLoad.current = false;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar pedidos');
      } finally {
        setLoading(false);
      }
    }

    init();

    channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order;
          if (!knownIds.current.has(newOrder.id)) {
            knownIds.current.add(newOrder.id);
            setOrders((prev) => [newOrder, ...prev]);
            window.dispatchEvent(
              new CustomEvent('new-order', { detail: newOrder })
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new as Order;
          setOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? updated : o))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload) => {
          const deleted = payload.old as Order;
          knownIds.current.delete(deleted.id);
          setOrders((prev) => prev.filter((o) => o.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    // Optimistic: move card instantly, Realtime will confirm
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (updateError) {
      // Roll back on failure — re-fetch real state
      const { data } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setOrders(data as Order[]);
      throw updateError;
    }
  };

  return { orders, loading, error, updateOrderStatus };
}

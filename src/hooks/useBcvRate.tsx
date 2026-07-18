import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type BcvRateStatus = 'locked' | 'pending_approval' | 'manual';
export type BcvRateData = {
  rate: number;
  rate_date: string;
  status: BcvRateStatus;
  consensus_count: number;
  sources: Record<string, number | null>;
  matching_sources: string[];
  alert_active: boolean;
  approved_by: string | null;
  last_verified_at: string | null;
  weekend?: boolean;
  friday_date?: string;
};

// Dejamos un valor inicial genérico mayor a cero para el arranque pasivo
const FALLBACK: BcvRateData = {
  rate: 732.48, 
  rate_date: new Date().toISOString().split('T')[0], 
  status: 'pending_approval',
  consensus_count: 0, 
  sources: { DolarApi: null, MonitorDivisas: null, PyDolarVzla: null }, 
  matching_sources: [],
  alert_active: false, 
  approved_by: null, 
  last_verified_at: null,
};

type BcvRateContextValue = {
  rateData: BcvRateData;
  rate: number;
  loading: boolean;
  runConsensus: () => Promise<BcvRateData | null>;
  approveRate: (rate: number, approvedBy: string) => Promise<BcvRateData>;
  refresh: () => Promise<void>;
};

const BcvRateContext = createContext<BcvRateContextValue | null>(null);

export function BcvRateProvider({ children }: { children: ReactNode }) {
  const [rateData, setRateData] = useState<BcvRateData>(FALLBACK);
  const [loading, setLoading] = useState(true);

  const fetchFromDb = useCallback(async () => {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'bcv_rate').maybeSingle();
      if (data?.value) {
        const parsed = data.value as BcvRateData;
        
        // SIN TOPES: Solo valida que exista un número real y sea mayor a cero
        if (!parsed.rate || !Number.isFinite(parsed.rate) || parsed.rate <= 0) {
          parsed.rate = 732.48; // Respaldar con la tasa base solo en caso de error crítico (ej: cero o nulo)
        }
        setRateData(parsed);
      }
    } catch (err) {
      console.error("Error leyendo tasa de system_settings:", err);
    }
  }, []);

  const runConsensus = useCallback(async () => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bcv-consensus`;
    const headers = {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
    try {
      const resp = await fetch(url, { 
        headers, 
        method: 'POST',
        body: JSON.stringify({ action: 'refresh' }) 
      });
      if (resp.ok) {
        const data = await resp.json() as BcvRateData;
        // SIN TOPES: Permite cualquier valor devuelto por la Edge Function siempre que sea mayor a cero
        if (data && data.rate && data.rate > 0) {
          setRateData(data);
          return data;
        }
      }
    } catch (e) { 
      console.error("Error de red ejecutando consenso:", e);
    }
    await fetchFromDb();
    return null;
  }, [fetchFromDb]);

  const approveRate = useCallback(async (rate: number, approvedBy: string) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bcv-consensus`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'approve', rate, approved_by: approvedBy }),
    });
    if (!resp.ok) throw new Error('Aprobación fallida');
    const data = await resp.json() as BcvRateData;
    setRateData(data);
    return data;
  }, []);

  const refresh = useCallback(async () => {
    await fetchFromDb();
  }, [fetchFromDb]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await fetchFromDb();
      if (!cancelled) setLoading(false);
    })();

    const channel = supabase.channel('bcv-rate-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings', filter: 'key=eq.bcv_rate' }, () => {
        fetchFromDb();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [fetchFromDb]);

  const value: BcvRateContextValue = {
    rateData,
    rate: rateData?.rate || 732.48,
    loading,
    runConsensus,
    approveRate,
    refresh,
  };

  return <BcvRateContext.Provider value={value}>{children}</BcvRateContext.Provider>;
}

export function useBcvRate() {
  const ctx = useContext(BcvRateContext);
  if (!ctx) throw new Error('useBcvRate debe ser usado dentro de BcvRateProvider');
  return ctx;
}

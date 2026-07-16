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

const FALLBACK: BcvRateData = {
  rate: 145.5, rate_date: '', status: 'pending_approval',
  consensus_count: 0, sources: {}, matching_sources: [],
  alert_active: true, approved_by: null, last_verified_at: null,
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
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'bcv_rate').maybeSingle();
    if (data?.value) setRateData(data.value as BcvRateData);
  }, []);

  const runConsensus = useCallback(async () => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bcv-consensus`;
    const headers = {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
    try {
      const resp = await fetch(url, { headers, method: 'GET' });
      if (resp.ok) {
        const data = await resp.json() as BcvRateData;
        setRateData(data);
        return data;
      }
    } catch { /* */ }
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
    if (!resp.ok) throw new Error('Approval failed');
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
      await runConsensus();
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
  }, [fetchFromDb, runConsensus]);

  const value: BcvRateContextValue = {
    rateData,
    rate: rateData.rate,
    loading,
    runConsensus,
    approveRate,
    refresh,
  };

  return <BcvRateContext.Provider value={value}>{children}</BcvRateContext.Provider>;
}

export function useBcvRate() {
  const ctx = useContext(BcvRateContext);
  if (!ctx) throw new Error('useBcvRate must be used within BcvRateProvider');
  return ctx;
}

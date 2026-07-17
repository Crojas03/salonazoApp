import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface SourceResult {
  name: string;
  rate: number | null;
  error: string | null;
}

async function fetchDolarApi(): Promise<SourceResult> {
  try {
    const resp = await fetch("https://dolarapi.com/v1/dolares/oficial", { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return { name: "DolarApi", rate: null, error: `HTTP ${resp.status}` };
    const data = await resp.json();
    const rate = Number(data.promedio || data.venta);
    if (!Number.isFinite(rate) || rate <= 0) return { name: "DolarApi", rate: null, error: "Mala estructura" };
    return { name: "DolarApi", rate: Math.round(rate * 100) / 100, error: null };
  } catch (e) {
    return { name: "DolarApi", rate: null, error: e instanceof Error ? e.message : "Unknown" };
  }
}

async function fetchMonitorDivisas(): Promise<SourceResult> {
  try {
    const resp = await fetch("https://api.monitordivisas.com/api/v1/oficial", { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return { name: "MonitorDivisas", rate: null, error: `HTTP ${resp.status}` };
    const data = await resp.json();
    const rate = Number(data.rate || data.price);
    if (!Number.isFinite(rate) || rate <= 0) return { name: "MonitorDivisas", rate: null, error: "Mala estructura" };
    return { name: "MonitorDivisas", rate: Math.round(rate * 100) / 100, error: null };
  } catch (e) {
    return { name: "MonitorDivisas", rate: null, error: e instanceof Error ? e.message : "Unknown" };
  }
}

async function fetchPyDolarVzla(): Promise<SourceResult> {
  try {
    const resp = await fetch("https://pydolarvenezuela-api.vercel.app/api/v1/dollar?page=bcv", {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(7000)
    });
    if (!resp.ok) return { name: "PyDolarVzla", rate: null, error: `HTTP ${resp.status}` };
    const data = await resp.json();
    const rate = Number(data.monitors?.bcv?.price ?? data.price);
    if (!Number.isFinite(rate) || rate <= 0) return { name: "PyDolarVzla", rate: null, error: "Mala estructura" };
    return { name: "PyDolarVzla", rate: Math.round(rate * 100) / 100, error: null };
  } catch (e) {
    return { name: "PyDolarVzla", rate: null, error: e instanceof Error ? e.message : "Unknown" };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'refresh';

    // ACCIÓN: Aprobación Manual
    if (action === 'approve') {
      const { rate, approved_by } = body;
      if (!rate || rate <= 0) throw new Error("Tasa inválida para aprobación");

      const payload = {
        rate: Math.round(rate * 100) / 100,
        rate_date: new Date().toISOString().split('T')[0],
        status: 'manual',
        consensus_count: 0,
        sources: { DolarApi: rate, MonitorDivisas: rate, PyDolarVzla: rate },
        matching_sources: [],
        alert_active: false,
        approved_by: approved_by || 'admin',
        last_verified_at: new Date().toISOString()
      };

      await supabase.from('system_settings').upsert({ key: 'bcv_rate', value: payload });
      return new Response(JSON.stringify(payload), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    // ACCIÓN: Consenso / Refresh Automático
    const results = await Promise.all([fetchDolarApi(), fetchMonitorDivisas(), fetchPyDolarVzla()]);
    const sourcesMap: Record<string, number | null> = {};
    const validRates: number[] = [];

    results.forEach(r => {
      sourcesMap[r.name] = r.rate;
      if (r.rate !== null) validRates.push(r.rate);
    });

    // Buscar coincidencias exactas para formar Quórum
    const rateCounts: Record<number, string[]> = {};
    results.forEach(r => {
      if (r.rate !== null) {
        if (!rateCounts[r.rate]) rateCounts[r.rate] = [];
        rateCounts[r.rate].push(r.name);
      }
    });

    let finalRate = 45.50;
    let matchingSources: string[] = [];
    let isLocked = false;

    // Con 3 fuentes en total, requerimos que al menos 2 coincidan exactamente
    for (const [rStr, srcNames] of Object.entries(rateCounts)) {
      if (srcNames.length >= 2) {
        finalRate = Number(rStr);
        matchingSources = srcNames;
        isLocked = true;
        break;
      }
    }

    // Si no hay acuerdo claro, tomar el promedio de las que respondieron para no romper nada
    if (!isLocked && validRates.length > 0) {
      finalRate = validRates.reduce((a, b) => a + b, 0) / validRates.length;
    }

    // Leer estado previo de resguardo
    const { data: oldSetting } = await supabase.from('system_settings').select('value').eq('key', 'bcv_rate').maybeSingle();
    const oldVal = oldSetting?.value as any;

    const payload = {
      rate: Math.round(finalRate * 100) / 100,
      rate_date: new Date().toISOString().split('T')[0],
      status: isLocked ? 'locked' : 'pending_approval',
      consensus_count: validRates.length,
      sources: sourcesMap,
      matching_sources: matchingSources,
      alert_active: !isLocked,
      approved_by: isLocked ? 'ConsensusEngine' : (oldVal?.approved_by || null),
      last_verified_at: new Date().toISOString()
    };

    await supabase.from('system_settings').upsert({ key: 'bcv_rate', value: payload });
    return new Response(JSON.stringify(payload), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
});

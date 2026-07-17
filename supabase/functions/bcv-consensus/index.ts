import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

type SourceResult = { name: string; rate: number | null; error: string | null };

// --- Fuente 1: DolarApi Oficial (JSON API) ---
async function fetchDolarApiOficial(): Promise<SourceResult> {
  try {
    const resp = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
      signal: AbortSignal.timeout(8000),
      headers: { "Accept": "application/json" },
    });
    if (!resp.ok) return { name: "DolarApi", rate: null, error: `HTTP ${resp.status}` };
    const data = await resp.json();
    const rate = Number(data.promedio ?? data.venta ?? data.compra);
    if (!Number.isFinite(rate) || rate <= 0) return { name: "DolarApi", rate: null, error: "Tasa inválida" };
    return { name: "DolarApi", rate: Math.round(rate * 100) / 100, error: null };
  } catch (e) {
    return { name: "DolarApi", rate: null, error: e instanceof Error ? e.message : "Unknown" };
  }
}

// --- Fuente 2: Monitor de Divisas Venezuela (HTML Scraping) ---
async function fetchMonitorDivisas(): Promise<SourceResult> {
  try {
    const resp = await fetch("https://www.monitordedivisavenezuela.com/", {
      signal: AbortSignal.timeout(8000),
      headers: { "Accept": "text/html", "User-Agent": "Mozilla/5.0" },
    });
    if (!resp.ok) return { name: "MonitorDivisas", rate: null, error: `HTTP ${resp.status}` };
    const html = await resp.text();

    const patterns = [
      /(?:bcv|oficial)[^0-9]{0,50}(\d{2,3}[,.]\d{2,4})/i,
      /(?:tasa|cambio|dolar)[^0-9]{0,30}(\d{2,3}[,.]\d{2,4})/i,
    ];

    for (const p of patterns) {
      const m = html.match(p);
      if (m) {
        const rate = Number(m[1].replace(",", "."));
        if (Number.isFinite(rate) && rate > 50 && rate < 2000) {
          return { name: "MonitorDivisas", rate: Math.round(rate * 100) / 100, error: null };
        }
      }
    }
    return { name: "MonitorDivisas", rate: null, error: "No se encontró tasa" };
  } catch (e) {
    return { name: "MonitorDivisas", rate: null, error: e instanceof Error ? e.message : "Unknown" };
  }
}

// --- Fuente 3: DolarVzla (Removida / Endpoint Desactivado) ---
async function fetchDolarVzla(): Promise<SourceResult> {
  return { name: "DolarVzla", rate: null, error: "Endpoint obsoleto" };
}

// --- Fuente 4: CotizaVe (Removida / Endpoint Desactivado) ---
async function fetchCotizaVe(): Promise<SourceResult> {
  return { name: "CotizaVe", rate: null, error: "Endpoint obsoleto" };
}

async function fetchAllSources(): Promise<SourceResult[]> {
  return Promise.all([
    fetchDolarApiOficial(),
    fetchMonitorDivisas(),
    fetchDolarVzla(),
    fetchCotizaVe(),
  ]);
}

function computeConsensus(results: SourceResult[]) {
  const valid = results.filter((r) => r.rate !== null);
  if (valid.length === 0) return { consensusRate: null as number | null, consensusCount: 0, matches: [] as string[] };

  const tolerance = 0.50;
  const groups: { rate: number; sources: string[] }[] = [];
  
  for (const r of valid) {
    const rounded = Math.round(r.rate! * 100) / 100;
    const existing = groups.find((g) => Math.abs(g.rate - rounded) <= tolerance);
    if (existing) {
      existing.sources.push(r.name);
      existing.rate = Math.round((existing.rate + rounded) / 2 * 100) / 100;
    } else {
      groups.push({ rate: rounded, sources: [r.name] });
    }
  }

  let best = { rate: 0, sources: [] as string[] };
  for (const g of groups) {
    if (g.sources.length > best.sources.length) best = g;
  }

  // REGLA ESTRICTA DE CONSENSO: Mínimo 3 fuentes idénticas obligatorias
  return {
    consensusRate: best.sources.length >= 3 ? best.rate : null,
    consensusCount: best.sources.length,
    matches: best.sources,
  };
}

function getVeDate(): Date {
  const now = new Date();
  return new Date(now.getTime() - 4 * 60 * 60 * 1000);
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function lastFridayDate(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const back = (day + 2) % 7;
  date.setDate(date.getDate() - back);
  return date.toISOString().split("T")[0];
}

async function readSetting(): Promise<Record<string, unknown> | null> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", "bcv_rate").maybeSingle();
  return (data?.value as Record<string, unknown>) ?? null;
}

async function writeSetting(value: Record<string, unknown>) {
  await supabase.from("system_settings").upsert({ key: "bcv_rate", value, updated_at: new Date().toISOString() });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // --- MANEJO DE ACCIONES POR POST ---
    if (req.method === "POST") {
      const body = await req.json();

      // 1. Aprobación manual por el administrador
      if (body.action === "approve") {
        const rate = Number(body.rate);
        const approvedBy = String(body.approved_by ?? "admin");
        if (!Number.isFinite(rate) || rate <= 0) {
          return new Response(JSON.stringify({ error: "Tasa inválida" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const veDate = getVeDate();
        const todayStr = veDate.toISOString().split("T")[0];
        const value = {
          rate: Math.round(rate * 100) / 100,
          rate_date: todayStr,
          status: "manual",
          consensus_count: 0,
          sources: {},
          matching_sources: [],
          alert_active: false,
          approved_by: approvedBy,
          last_verified_at: new Date().toISOString(),
        };
        await writeSetting(value);
        return new Response(JSON.stringify({ ok: true, ...value }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Forzar refresco (Ejecutado por el botón circular de la interfaz)
      if (body.action === "refresh") {
        const results = await fetchAllSources();
        const { consensusRate, consensusCount, matches } = computeConsensus(results);
        
        const sourcesMap: Record<string, number | null> = {};
        for (const r of results) sourcesMap[r.name] = r.rate;
        
        const veDate = getVeDate();
        const todayStr = veDate.toISOString().split("T")[0];
        const existing = await readSetting();
        const existingRate = existing ? Number(existing.rate) : 0;

        // VERIFICACIÓN ESTRICTA (Mínimo 3 fuentes)
        if (consensusRate !== null && consensusCount >= 3) {
          const value = {
            rate: consensusRate,
            rate_date: todayStr,
            status: "locked",
            consensus_count: consensusCount,
            sources: sourcesMap,
            matching_sources: matches,
            alert_active: false,
            approved_by: null,
            last_verified_at: new Date().toISOString(),
          };
          await writeSetting(value);
          return new Response(JSON.stringify(value), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } else {
          // Si da 2/4, entra aquí directamente eliminando los fallbacks automáticos de varianza
          const value = {
            rate: existingRate > 0 ? existingRate : 45.5,
            rate_date: todayStr, // Actualizamos la fecha a hoy para que registre el intento fallido de hoy
            status: "pending_approval",
            consensus_count: consensusCount,
            sources: sourcesMap,
            matching_sources: matches,
            alert_active: true,
            approved_by: null,
            last_verified_at: new Date().toISOString(),
          };
          await writeSetting(value);
          return new Response(JSON.stringify(value), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    // --- MANEJO DE CONSULTA ORDINARIA POR GET ---
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    const veDate = getVeDate();
    const todayStr = veDate.toISOString().split("T")[0];
    const weekend = isWeekend(veDate);
    const existing = await readSetting();
    const existingRate = existing ? Number(existing.rate) : 0;

    // Si ya existe registro de hoy y está verificado, se sirve directo (a menos que se use ?force=true)
    if (!force && existing && existing.rate_date === todayStr && (existing.status === "locked" || existing.status === "manual")) {
      return new Response(JSON.stringify(existing), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Regla de fin de semana
    if (weekend && !force) {
      const fridayStr = lastFridayDate(veDate);
      const value = {
        rate: existingRate > 0 ? existingRate : 45.5,
        rate_date: todayStr,
        status: "locked",
        consensus_count: existing?.consensus_count ?? 0,
        sources: existing?.sources ?? {},
        matching_sources: existing?.matching_sources ?? [],
        alert_active: false,
        approved_by: existing?.approved_by ?? null,
        last_verified_at: new Date().toISOString(),
        weekend: true,
        friday_date: fridayStr,
      };
      await writeSetting(value);
      return new Response(JSON.stringify(value), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Consulta en vivo por falta de registros previos o expiración de fecha
    const results = await fetchAllSources();
    const { consensusRate, consensusCount, matches } = computeConsensus(results);

    const sourcesMap: Record<string, number | null> = {};
    for (const r of results) sourcesMap[r.name] = r.rate;

    if (consensusRate !== null && consensusCount >= 3) {
      const value = {
        rate: consensusRate,
        rate_date: todayStr,
        status: "locked",
        consensus_count: consensusCount,
        sources: sourcesMap,
        matching_sources: matches,
        alert_active: false,
        approved_by: null,
        last_verified_at: new Date().toISOString(),
      };
      await writeSetting(value);
      return new Response(JSON.stringify(value), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      const value = {
        rate: existingRate > 0 ? existingRate : 45.5,
        rate_date: todayStr,
        status: "pending_approval",
        consensus_count: consensusCount,
        sources: sourcesMap,
        matching_sources: matches,
        alert_active: true,
        approved_by: null,
        last_verified_at: new Date().toISOString(),
      };
      await writeSetting(value);
      return new Response(JSON.stringify(value), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

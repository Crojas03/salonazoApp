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

// --- Source 1: DolarApi Oficial (JSON API — confirmed working) ---
// Returns { promedio: 727.4512, venta: null, compra: null, ... }
async function fetchDolarApiOficial(): Promise<SourceResult> {
  try {
    const resp = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
      signal: AbortSignal.timeout(8000),
      headers: { "Accept": "application/json" },
    });
    if (!resp.ok) return { name: "DolarApi", rate: null, error: `HTTP ${resp.status}` };
    const data = await resp.json();
    const rate = Number(data.promedio ?? data.venta ?? data.compra);
    if (!Number.isFinite(rate) || rate <= 0) return { name: "DolarApi", rate: null, error: "Invalid rate" };
    return { name: "DolarApi", rate: Math.round(rate * 100) / 100, error: null };
  } catch (e) {
    return { name: "DolarApi", rate: null, error: e instanceof Error ? e.message : "Unknown" };
  }
}

// --- Source 2: Monitor de Divisas Venezuela (HTML scraping) ---
// The site https://www.monitordedivisavenezuela.com embeds the BCV rate in HTML.
async function fetchMonitorDivisas(): Promise<SourceResult> {
  try {
    const resp = await fetch("https://www.monitordedivisavenezuela.com/", {
      signal: AbortSignal.timeout(8000),
      headers: { "Accept": "text/html", "User-Agent": "Mozilla/5.0" },
    });
    if (!resp.ok) return { name: "MonitorDivisas", rate: null, error: `HTTP ${resp.status}` };
    const html = await resp.text();

    // Try multiple regex patterns to extract the BCV rate
    // Pattern 1: Look for "BCV" followed by a number
    const patterns = [
      /(?:bcv|oficial)[^0-9]{0,50}(\d{2,3}[,.]\d{2,4})/i,
      /(?:tasa|cambio|dolar)[^0-9]{0,30}(\d{2,3}[,.]\d{2,4})/i,
      /"rate"\s*:\s*(\d+\.?\d*)/i,
      /"bcv"\s*:\s*(\d+\.?\d*)/i,
      /data-rate="(\d+\.?\d*)"/i,
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
    return { name: "MonitorDivisas", rate: null, error: "No rate found in HTML" };
  } catch (e) {
    return { name: "MonitorDivisas", rate: null, error: e instanceof Error ? e.message : "Unknown" };
  }
}

// --- Source 3: PyDolar API (try multiple endpoints) ---
async function fetchPyDolar(): Promise<SourceResult> {
  const urls = [
    "https://api.pydolar.net/v1/dolares/bcv",
    "https://api.pydolar.net/api/v1/dolares/bcv",
    "https://pydolar.net/api/v1/dolares/bcv",
  ];
  for (const url of urls) {
    try {
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(6000),
        headers: { "Accept": "application/json" },
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const rate = Number(
        data.tasa ?? data.venta ?? data.price ?? data.promedio ??
        data.bcv ?? data.dolar ?? data.usd ??
        (Array.isArray(data) && data[0] ? (data[0].tasa ?? data[0].venta ?? data[0].price) : null)
      );
      if (Number.isFinite(rate) && rate > 0) {
        return { name: "PyDolar", rate: Math.round(rate * 100) / 100, error: null };
      }
    } catch { /* try next URL */ }
  }
  return { name: "PyDolar", rate: null, error: "All endpoints failed" };
}

// --- Source 4: BCV Website (HTML scraping — the original source) ---
async function fetchBCVWebsite(): Promise<SourceResult> {
  try {
    const resp = await fetch("https://www.bcv.org.ve/", {
      signal: AbortSignal.timeout(8000),
      headers: {
        "Accept": "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!resp.ok) return { name: "BCVWebsite", rate: null, error: `HTTP ${resp.status}` };
    const html = await resp.text();

    // BCV site embeds rates in HTML — try multiple patterns
    const patterns = [
      /dolar[^0-9]{0,100}(\d{1,3}[,.]\d{2,4})/i,
      /USD[^0-9]{0,100}(\d{1,3}[,.]\d{2,4})/i,
      /"dolar"\s*:\s*"?(\d+[,.]?\d*)"?/i,
      /tipo-de-cambio[^0-9]{0,100}(\d{1,3}[,.]\d{2,4})/i,
      /field-item[^0-9]{0,30}(\d{1,3}[,.]\d{2,4})/i,
    ];

    for (const p of patterns) {
      const m = html.match(p);
      if (m) {
        const rate = Number(m[1].replace(",", "."));
        if (Number.isFinite(rate) && rate > 50 && rate < 2000) {
          return { name: "BCVWebsite", rate: Math.round(rate * 100) / 100, error: null };
        }
      }
    }
    return { name: "BCVWebsite", rate: null, error: "No rate found in HTML" };
  } catch (e) {
    return { name: "BCVWebsite", rate: null, error: e instanceof Error ? e.message : "Unknown" };
  }
}

async function fetchAllSources(): Promise<SourceResult[]> {
  return Promise.all([
    fetchDolarApiOficial(),
    fetchMonitorDivisas(),
    fetchPyDolar(),
    fetchBCVWebsite(),
  ]);
}

function computeConsensus(results: SourceResult[]) {
  const valid = results.filter((r) => r.rate !== null);
  if (valid.length === 0) return { consensusRate: null as number | null, consensusCount: 0, matches: [] as string[] };

  // Group rates that are within 0.50 of each other (tolerance for rounding differences)
  const tolerance = 0.50;
  const groups: { rate: number; sources: string[] }[] = [];
  for (const r of valid) {
    const rounded = Math.round(r.rate! * 100) / 100;
    const existing = groups.find((g) => Math.abs(g.rate - rounded) <= tolerance);
    if (existing) {
      existing.sources.push(r.name);
      // Update to average of matching sources
      existing.rate = Math.round((existing.rate + rounded) / 2 * 100) / 100;
    } else {
      groups.push({ rate: rounded, sources: [r.name] });
    }
  }

  let best = { rate: 0, sources: [] as string[] };
  for (const g of groups) {
    if (g.sources.length > best.sources.length) best = g;
  }

  return {
    consensusRate: best.sources.length >= 2 ? best.rate : null,
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
    // POST: manual approval
    if (req.method === "POST") {
      const body = await req.json();
      if (body.action === "approve") {
        const rate = Number(body.rate);
        const approvedBy = String(body.approved_by ?? "admin");
        if (!Number.isFinite(rate) || rate <= 0) {
          return new Response(JSON.stringify({ error: "Invalid rate" }), {
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

      // POST: force refresh (admin triggers re-fetch from all sources)
      if (body.action === "refresh") {
        const results = await fetchAllSources();
        const { consensusRate, consensusCount, matches } = computeConsensus(results);
        const sourcesMap: Record<string, number | null> = {};
        for (const r of results) sourcesMap[r.name] = r.rate;
        const veDate = getVeDate();
        const todayStr = veDate.toISOString().split("T")[0];
        const existing = await readSetting();
        const existingRate = existing ? Number(existing.rate) : 0;

        if (consensusRate !== null && consensusCount >= 2) {
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
          return new Response(JSON.stringify(value), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          // Check variance: if best rate is within 15% of existing, accept it
          const bestValid = results.find((r) => r.rate !== null);
          if (bestValid && existingRate > 0) {
            const variance = Math.abs(bestValid.rate! - existingRate) / existingRate;
            if (variance <= 0.15) {
              const value = {
                rate: bestValid.rate!,
                rate_date: todayStr,
                status: "locked",
                consensus_count: 1,
                sources: sourcesMap,
                matching_sources: [bestValid.name],
                alert_active: false,
                approved_by: null,
                last_verified_at: new Date().toISOString(),
              };
              await writeSetting(value);
              return new Response(JSON.stringify(value), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
          // Consensus failed: keep old rate, raise alert
          const value = {
            rate: existingRate > 0 ? existingRate : 145.5,
            rate_date: existing?.rate_date ?? todayStr,
            status: "pending_approval",
            consensus_count: consensusCount,
            sources: sourcesMap,
            matching_sources: matches,
            alert_active: true,
            approved_by: null,
            last_verified_at: new Date().toISOString(),
          };
          await writeSetting(value);
          return new Response(JSON.stringify(value), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // GET: consensus check
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    const veDate = getVeDate();
    const todayStr = veDate.toISOString().split("T")[0];
    const weekend = isWeekend(veDate);
    const existing = await readSetting();
    const existingRate = existing ? Number(existing.rate) : 0;

    // Already locked for today? Return it (unless force refresh).
    if (!force && existing && existing.rate_date === todayStr && (existing.status === "locked" || existing.status === "manual")) {
      return new Response(JSON.stringify(existing), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Weekend rule: use Friday's rate, don't fetch
    if (weekend && !force) {
      const fridayStr = lastFridayDate(veDate);
      const value = {
        rate: existingRate > 0 ? existingRate : 145.5,
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
      return new Response(JSON.stringify(value), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Business day (or forced): fetch from all 4 sources in parallel
    const results = await fetchAllSources();
    const { consensusRate, consensusCount, matches } = computeConsensus(results);

    const sourcesMap: Record<string, number | null> = {};
    for (const r of results) sourcesMap[r.name] = r.rate;

    if (consensusRate !== null && consensusCount >= 2) {
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
      return new Response(JSON.stringify(value), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Check variance: if best rate is within 15% of existing, accept it
      const bestValid = results.find((r) => r.rate !== null);
      if (bestValid && existingRate > 0) {
        const variance = Math.abs(bestValid.rate! - existingRate) / existingRate;
        if (variance <= 0.15) {
          const value = {
            rate: bestValid.rate!,
            rate_date: todayStr,
            status: "locked",
            consensus_count: 1,
            sources: sourcesMap,
            matching_sources: [bestValid.name],
            alert_active: false,
            approved_by: null,
            last_verified_at: new Date().toISOString(),
          };
          await writeSetting(value);
          return new Response(JSON.stringify(value), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      // Consensus failed: keep old rate, raise alert
      const value = {
        rate: existingRate > 0 ? existingRate : 145.5,
        rate_date: existing?.rate_date ?? todayStr,
        status: "pending_approval",
        consensus_count: consensusCount,
        sources: sourcesMap,
        matching_sources: matches,
        alert_active: true,
        approved_by: null,
        last_verified_at: new Date().toISOString(),
      };
      await writeSetting(value);
      return new Response(JSON.stringify(value), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function hash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json();
    const { action } = body;

    // ─── REGISTER: phone + name + pin ────────────────────────────
    if (action === "register") {
      const { phone, name, pin, zone_id, address } = body;
      if (!phone || !name || !pin) {
        return new Response(JSON.stringify({ error: "Faltan datos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!/^\d{4}-\d{7}$/.test(phone)) {
        return new Response(JSON.stringify({ error: "Formato de teléfono inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!/^\d{4}$/.test(pin)) {
        return new Response(JSON.stringify({ error: "PIN debe ser 4 dígitos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ error: "Ya existe una cuenta con este teléfono" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pin_hash = await hash(phone + pin);
      const { data, error } = await supabase
        .from("profiles")
        .insert({ phone, name, pin_hash, zone_id: zone_id ?? null, address: address ?? null })
        .select("id, phone, name, zone_id, address, birthday, email")
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ profile: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── LOGIN: phone + pin ───────────────────────────────────────
    if (action === "login") {
      const { phone, pin } = body;
      if (!phone || !pin) {
        return new Response(JSON.stringify({ error: "Faltan datos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pin_hash = await hash(phone + pin);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, phone, name, zone_id, address, birthday, email")
        .eq("phone", phone)
        .eq("pin_hash", pin_hash)
        .maybeSingle();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Teléfono o PIN incorrecto" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user has staff roles
      const { data: roles } = await supabase
        .from("staff_roles")
        .select("role")
        .eq("phone", phone)
        .eq("is_active", true);
      const staffRoles = (roles ?? []).map((r: { role: string }) => r.role);

      return new Response(JSON.stringify({ profile: data, staffRoles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SETUP OPERATOR: email + password ────────────────────────
    if (action === "setup_operator") {
      const { phone, email, password } = body;
      if (!phone || !email || !password) {
        return new Response(JSON.stringify({ error: "Faltan datos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (password.length < 6) {
        return new Response(JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify the profile exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      if (!profile) {
        return new Response(JSON.stringify({ error: "Perfil no encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check email uniqueness
      const { data: emailExists } = await supabase
        .from("profiles")
        .select("id")
        .neq("id", profile.id)
        .eq("email", email)
        .maybeSingle();
      if (emailExists) {
        return new Response(JSON.stringify({ error: "Este email ya está registrado" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const password_hash = await hash(email + password);
      const { error } = await supabase
        .from("profiles")
        .update({ email, password_hash, updated_at: new Date().toISOString() })
        .eq("id", profile.id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── VERIFY OPERATOR: email + password ────────────────────────
    if (action === "verify_operator") {
      const { phone, email, password } = body;
      if (!phone || !email || !password) {
        return new Response(JSON.stringify({ error: "Faltan datos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const password_hash = await hash(email + password);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, phone, name, email")
        .eq("phone", phone)
        .eq("email", email)
        .eq("password_hash", password_hash)
        .maybeSingle();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Email o contraseña incorrectos" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ verified: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET OPERATOR STATUS ─────────────────────────────────────
    if (action === "operator_status") {
      const { phone } = body;
      if (!phone) {
        return new Response(JSON.stringify({ error: "Falta teléfono" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data } = await supabase
        .from("profiles")
        .select("email")
        .eq("phone", phone)
        .maybeSingle();
      const hasOperatorAuth = !!(data && data.email);
      return new Response(JSON.stringify({ hasOperatorAuth }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Acción no válida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

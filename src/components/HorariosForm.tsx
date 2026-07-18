import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Save, Loader2, Check, AlertCircle } from 'lucide-react';

const DAYS = [
  { key: 'monday', label: 'Lunes' }, { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' }, { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' }, { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
] as const;

type DayHours = { isOpen: boolean; openTime: string; closeTime: string };
type BusinessHours = Record<string, DayHours>;

function defaultHours(): BusinessHours {
  const base: DayHours = { isOpen: true, openTime: '08:00', closeTime: '17:00' };
  return Object.fromEntries(DAYS.map(d => [d.key, { ...base }]));
}

export function HorariosForm() {
  const [hours, setHours] = useState<BusinessHours | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('system_settings').select('value').eq('key', 'business_hours').maybeSingle().then(({ data }) => {
      const v = (data?.value as BusinessHours) ?? null;
      setHours(v ?? defaultHours());
      setLoading(false);
    });
  }, []);

  const updateDay = (key: string, patch: Partial<DayHours>) => {
    setHours(prev => prev ? { ...prev, [key]: { ...prev[key], ...patch } } : prev);
    setSaved(false);
  };

  const save = async () => {
    if (!hours) return;
    setSaving(true); setError(null); setSaved(false);
    const { error: upErr } = await supabase.from('system_settings').upsert(
      { key: 'business_hours', value: hours as any, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    setSaving(false);
    if (upErr) { setError(upErr.message); return; }
    setSaved(true);
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>;

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-black text-white">Horario de Atención</h3>
        </div>
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
      
      {error && <div className="text-red-400 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
      
      <div className="space-y-2">
        {DAYS.map(d => {
          // Corrección: Usamos ?? defaultHours()[d.key] para garantizar que el día exista siempre
          const day = hours?.[d.key] ?? defaultHours()[d.key];
          
          return (
            <div key={d.key} className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg border border-gray-800">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={day.isOpen} 
                  onChange={() => updateDay(d.key, { isOpen: !day.isOpen })} 
                  className="w-4 h-4 rounded text-orange-500" 
                />
                <span className="text-sm font-bold text-white w-20">{d.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="time" 
                  disabled={!day.isOpen} 
                  value={day.openTime} 
                  onChange={e => updateDay(d.key, { openTime: e.target.value })} 
                  className="bg-gray-950 p-1.5 rounded text-xs text-white border border-gray-700" 
                />
                <input 
                  type="time" 
                  disabled={!day.isOpen} 
                  value={day.closeTime} 
                  onChange={e => updateDay(d.key, { closeTime: e.target.value })} 
                  className="bg-gray-950 p-1.5 rounded text-xs text-white border border-gray-700" 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

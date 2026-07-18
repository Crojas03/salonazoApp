import { useState } from 'react';
import { HorariosForm } from './HorariosForm';
import { Clock, Sliders } from 'lucide-react';

export function AjustesTab() {
  const [subTab, setSubTab] = useState<'horarios' | 'general'>('horarios');
  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-800 pb-3">
        <button onClick={() => setSubTab('horarios')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${subTab === 'horarios' ? 'bg-orange-500/10 text-orange-400' : 'text-gray-400'}`}>
          <Clock className="w-3.5 h-3.5" /> Horarios
        </button>
      </div>
      {subTab === 'horarios' && <HorariosForm />}
    </div>
  );
}

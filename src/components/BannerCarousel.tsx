import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Tag, Gift, Percent } from 'lucide-react';
type Banner = { id: string; title: string; subtitle: string; cta: string; gradient: string; Icon: typeof Sparkles };
const BANNERS: Banner[] = [
  { id: 'welcome', title: '10% OFF en tu primer pedido', subtitle: 'Usa el código BIENVENIDO', cta: 'Aplicar cupón', gradient: 'from-violet-600 via-purple-600 to-fuchsia-600', Icon: Sparkles },
  { id: 'birthday', title: '15% de descuento en tu cumpleaños', subtitle: 'Registra tu fecha de nacimiento', cta: 'Configurar', gradient: 'from-purple-700 via-violet-700 to-indigo-700', Icon: Gift },
  { id: 'pro', title: 'Salonazo PRO · $5 off siempre', subtitle: 'Suscríbete con SALONAZOPRO', cta: 'Unirme a PRO', gradient: 'from-fuchsia-600 via-purple-600 to-violet-700', Icon: Percent },
  { id: 'combo', title: 'Combo Parrilla + Bebida desde $20', subtitle: 'Parrilla mixta + limonada + postre', cta: 'Ver combo', gradient: 'from-violet-600 via-purple-700 to-fuchsia-700', Icon: Tag },
];
export function BannerCarousel() {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const i = setInterval(() => setActive(p => (p + 1) % BANNERS.length), 5000); return () => clearInterval(i); }, []);
  useEffect(() => { const el = ref.current; if (el) el.scrollTo({ left: active * el.offsetWidth, behavior: 'smooth' }); }, [active]);
  return (
    <div className="px-4 pt-3 pb-1">
      <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-purple-400" /> Descuentos</h3><div className="flex gap-1"><button type="button" onClick={() => setActive(p => (p - 1 + BANNERS.length) % BANNERS.length)} className="w-6 h-6 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center active:scale-90 transition-all"><ChevronLeft className="w-3.5 h-3.5 text-gray-400" /></button><button type="button" onClick={() => setActive(p => (p + 1) % BANNERS.length)} className="w-6 h-6 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center active:scale-90 transition-all"><ChevronRight className="w-3.5 h-3.5 text-gray-400" /></button></div></div>
      <div ref={ref} className="flex overflow-x-auto scrollbar-none snap-x" style={{ scrollSnapType: 'x mandatory' }}>{BANNERS.map(b => { const { Icon } = b; return <div key={b.id} className="snap-start flex-shrink-0 w-full"><div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${b.gradient} p-4 cursor-pointer active:scale-[0.98] transition-transform`}><div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" /><div className="relative flex items-start gap-3"><div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5 text-white" strokeWidth={2.5} /></div><div className="flex-1 min-w-0"><h4 className="font-black text-white text-sm leading-tight">{b.title}</h4><p className="text-[11px] text-white/80 mt-1">{b.subtitle}</p><div className="inline-flex items-center gap-1 mt-2.5 bg-white/20 rounded-full px-3 py-1"><span className="text-[11px] font-bold text-white">{b.cta}</span><ChevronRight className="w-3 h-3 text-white" /></div></div></div></div></div>; })}</div>
      <div className="flex justify-center gap-1.5 mt-2">{BANNERS.map((_, i) => <button key={i} type="button" onClick={() => setActive(i)} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-purple-500' : 'w-1.5 bg-gray-200'}`} />)}</div>
    </div>
  );
}

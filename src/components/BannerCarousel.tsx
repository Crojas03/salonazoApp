import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Banner = {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  cta: string;
  bg: string;
  accent: string;
  image: string;
};

const BANNERS: Banner[] = [
  {
    id: 'b1',
    tag: 'Oferta del día',
    title: 'Combo Parrilla\nFamiliar',
    subtitle: 'Para 4 personas · Antes $34.99',
    cta: '$24.99',
    bg: 'from-orange-600 to-red-700',
    accent: 'bg-orange-400/30',
    image: 'https://images.pexels.com/photos/410648/pexels-photo-410648.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    id: 'b2',
    tag: 'Lunes y Martes',
    title: '2×1 en\nHamburguesas',
    subtitle: 'Clásica con papas · Dos por el precio de una',
    cta: '$9.99',
    bg: 'from-amber-500 to-orange-600',
    accent: 'bg-amber-300/30',
    image: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    id: 'b3',
    tag: 'Siempre disponible',
    title: 'Menú del Día\ncompleto',
    subtitle: 'Entrada + plato + bebida + postre',
    cta: '$11.99',
    bg: 'from-emerald-600 to-teal-700',
    accent: 'bg-emerald-400/30',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    id: 'b4',
    tag: 'Fin de semana',
    title: 'Descuentos\nExclusivos',
    subtitle: 'Hasta 30% OFF en platos seleccionados',
    cta: 'Ver más',
    bg: 'from-violet-600 to-purple-700',
    accent: 'bg-violet-400/30',
    image: 'https://images.pexels.com/photos/1565982/pexels-photo-1565982.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
];

export function BannerCarousel() {
  const [current, setCurrent] = useState(0);
  const [, setDragging] = useState(false);
  const startX = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = BANNERS.length;

  const next = () => setCurrent(c => (c + 1) % count);
  const prev = () => setCurrent(c => (c - 1 + count) % count);

  // Auto-advance every 4 s
  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 4000);
  };

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Touch / swipe
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setDragging(false);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40) {
      dx < 0 ? next() : prev();
      resetTimer();
    }
    setDragging(false);
  };

  const b = BANNERS[current];

  return (
    <div className="px-4 py-3">
      <div
        className="relative rounded-3xl overflow-hidden shadow-xl select-none"
        style={{ height: 180 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Background image */}
        <img
          src={b.image}
          alt={b.title}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
          draggable={false}
        />

        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-r ${b.bg} opacity-85`} />

        {/* Noise texture for depth */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
        />

        {/* Decorative circle */}
        <div className={`absolute -right-10 -top-10 w-44 h-44 rounded-full ${b.accent}`} />
        <div className={`absolute -right-4 bottom-[-20px] w-28 h-28 rounded-full ${b.accent}`} />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-between p-5">
          <div>
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
              {b.tag}
            </span>
            <h2 className="mt-2 text-white font-black text-2xl leading-tight whitespace-pre-line drop-shadow-sm">
              {b.title}
            </h2>
            <p className="text-white/75 text-[11px] font-medium mt-0.5 leading-snug">
              {b.subtitle}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="bg-white rounded-xl px-4 py-2 shadow-lg">
              <span className="text-gray-900 font-black text-lg leading-none">{b.cta}</span>
            </div>

            {/* Dots */}
            <div className="flex items-center gap-1.5 mr-1">
              {BANNERS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrent(i); resetTimer(); }}
                  className={`rounded-full transition-all duration-300 ${
                    i === current ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40'
                  }`}
                  aria-label={`Banner ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Arrow buttons (desktop) */}
        <button
          onClick={() => { prev(); resetTimer(); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 flex items-center justify-center text-white transition-all active:scale-90 hidden sm:flex"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => { next(); resetTimer(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 flex items-center justify-center text-white transition-all active:scale-90 hidden sm:flex"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

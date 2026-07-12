import { useRef } from 'react';
import type { Category } from '../lib/supabase';
import { CategoryIcon } from './CategoryIcon';

type Props = {
  categories: Category[];
  activeCategory: string | null;
  onSelect: (slug: string) => void;
};

export function CategoryTabs({ categories, activeCategory, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="sticky top-[61px] z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat.slug;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.slug)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <CategoryIcon
                name={cat.icon}
                className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-gray-400'}`}
              />
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

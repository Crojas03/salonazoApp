import {
  Beef,
  Pizza,
  CupSoda,
  IceCream,
  Drumstick,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Beef,
  Pizza,
  CupSoda,
  IceCream,
  Drumstick,
  UtensilsCrossed,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] ?? UtensilsCrossed;
  return <Icon className={className} />;
}

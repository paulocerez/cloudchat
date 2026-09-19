import {
  Bike,
  BookOpen,
  Bookmark,
  Briefcase,
  Cake,
  Camera,
  Car,
  Dumbbell,
  Gift,
  GraduationCap,
  Heart,
  House,
  Moon,
  Mountain,
  Music,
  PartyPopper,
  Plane,
  Ship,
  Sun,
  Tent,
  TreePalm,
  Utensils,
  type LucideIcon,
} from 'lucide-react';

// A small curated set — periods and habits share it, the same way they already
// share PeriodColor and the tones in ./periods. Names are stored on the record;
// resolution always succeeds so unknown names degrade to the default bookmark.
export const PERIOD_ICONS: { name: string; Icon: LucideIcon }[] = [
  { name: 'bookmark', Icon: Bookmark },
  { name: 'plane', Icon: Plane },
  { name: 'palm', Icon: TreePalm },
  { name: 'mountain', Icon: Mountain },
  { name: 'tent', Icon: Tent },
  { name: 'car', Icon: Car },
  { name: 'ship', Icon: Ship },
  { name: 'house', Icon: House },
  { name: 'briefcase', Icon: Briefcase },
  { name: 'graduation', Icon: GraduationCap },
  { name: 'heart', Icon: Heart },
  { name: 'party', Icon: PartyPopper },
  { name: 'cake', Icon: Cake },
  { name: 'gift', Icon: Gift },
  { name: 'dumbbell', Icon: Dumbbell },
  { name: 'bike', Icon: Bike },
  { name: 'book', Icon: BookOpen },
  { name: 'music', Icon: Music },
  { name: 'camera', Icon: Camera },
  { name: 'utensils', Icon: Utensils },
  { name: 'moon', Icon: Moon },
  { name: 'sun', Icon: Sun },
];

export const DEFAULT_ICON = 'bookmark';

const BY_NAME = new Map(PERIOD_ICONS.map((i) => [i.name, i.Icon]));

export function iconFor(name?: string): LucideIcon {
  return (name && BY_NAME.get(name)) || Bookmark;
}

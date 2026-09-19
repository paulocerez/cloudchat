import { ListChecks, MapPin, Mic, Sprout } from 'lucide-react';
import type { JournalEntry } from '@cloudchat/shared';
import { useHabits } from './HabitSheet';
import { pocketMemos, sectionId } from './shared';

/**
 * The day at a glance, as a row of tiles you can actually hit.
 *
 * This replaces the collapsed "Actions" fold, which put everything about the
 * day one tap away behind a summary line nobody reads. A tile shows its number
 * without being opened and opens straight to the thing it counts.
 */
export function DayStats({
  entry,
  onOpenPlaces,
  onOpenHabits,
  onOpenTodos,
}: {
  entry: JournalEntry;
  onOpenPlaces: () => void;
  onOpenHabits: () => void;
  onOpenTodos: () => void;
}) {
  const { habits } = useHabits(entry.date);

  const places = entry.locations ?? [];
  const habitsDone = entry.habitsDone ?? [];
  const pocket = pocketMemos(entry);
  const todos = pocket.flatMap((m) => m.actionItems ?? []);
  const todosDone = todos.filter((t) => t.isCompleted).length;

  const jumpToPocket = () =>
    document
      .getElementById(sectionId('pocket'))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const tiles = [
    {
      key: 'places',
      Icon: MapPin,
      value: String(places.length),
      label: places.length === 1 ? 'place' : 'places',
      caption: places.length > 0 ? places.map((p) => p.name).join(', ') : undefined,
      onClick: onOpenPlaces,
    },
    todos.length > 0 && {
      key: 'todos',
      Icon: ListChecks,
      value: `${todosDone}/${todos.length}`,
      label: 'todos',
      onClick: onOpenTodos,
    },
    pocket.length > 0 && {
      key: 'pocket',
      Icon: Mic,
      value: String(pocket.length),
      label: pocket.length === 1 ? 'recording' : 'recordings',
      onClick: jumpToPocket,
    },
    habits.length > 0 && {
      key: 'habits',
      Icon: Sprout,
      value: `${habitsDone.length}/${habits.length}`,
      label: 'habits',
      onClick: onOpenHabits,
    },
  ].filter(Boolean) as {
    key: string;
    Icon: typeof MapPin;
    value: string;
    label: string;
    caption?: string;
    onClick: () => void;
  }[];

  if (tiles.length === 0) return null;

  return (
    // A scrolling rail rather than a grid: a day with four of these left an
    // orphan tile on its own row, and the count genuinely varies by day.
    <div className="mt-4 -mx-4 sm:-mx-6 md:-mx-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-2.5 px-4 sm:px-6 md:px-8 snap-x snap-mandatory">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={tile.onClick}
            title={tile.caption}
            className="surface squish shrink-0 snap-start w-[6.5rem] rounded-md px-3 py-2.5 text-left hover:bg-gray-50"
          >
            <tile.Icon size={16} strokeWidth={2} className="block text-[#71717D]" />
            <span className="block mt-1.5 text-[17px] font-semibold leading-none text-[#241F2E] tabular-nums">
              {tile.value}
            </span>
            <span className="block mt-1 text-[11px] text-[#71717D] truncate">{tile.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

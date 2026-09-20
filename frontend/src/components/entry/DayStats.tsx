import { ListChecks, MapPin, Mic, Plus, Sprout } from 'lucide-react';
import type { JournalEntry } from '@cloudchat/shared';
import { Pill, PillTray } from '~/components/ui/Pill';
import { useHabits } from './HabitSheet';
import { pocketMemos, sectionId } from './shared';

/**
 * The day at a glance, as one tray of properties you can actually hit.
 *
 * This replaces the collapsed "Actions" fold, which put everything about the
 * day one tap away behind a summary line nobody reads. A chip shows its number
 * without being opened and opens straight to the thing it counts.
 *
 * The chips wrap inside a single recessed tray rather than scrolling in a rail.
 * The rail existed because a four-tile grid left an orphan on its own row —
 * wrapping chips don't have that problem, and collecting them into one tray
 * reads as "everything about this day" instead of four unrelated cards.
 */
export function DayStats({
  entry,
  onOpenPlaces,
  onOpenHabits,
  onOpenTodos,
  onAdd,
}: {
  entry: JournalEntry;
  onOpenPlaces: () => void;
  onOpenHabits: () => void;
  onOpenTodos: () => void;
  onAdd: () => void;
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

  const chips = [
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

  return (
    <PillTray className="mt-4">
      {chips.map((chip) => (
        <Pill
          key={chip.key}
          icon={chip.Icon}
          label={chip.label}
          value={chip.value}
          title={chip.caption}
          onClick={chip.onClick}
          active
        />
      ))}
      {/* The tray always ends in a way to put something else in it — without
          this it reads as a readout rather than as the day's properties. */}
      <Pill icon={Plus} title="Add to this day" onClick={onAdd} />
    </PillTray>
  );
}

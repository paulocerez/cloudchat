import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronRight, ListChecks, MapPin, Mic, Star } from 'lucide-react';
import type { JournalEntry } from '@cloudchat/shared';
import { api } from '~/lib/api';
import { useHabits } from './HabitSheet';
import { formatDuration, pocketMemos, sectionId } from './shared';

/**
 * Replaces the horizontal pill tray. Pills read fine on a wide screen and turn
 * into a three-row thicket on a phone, so the day's properties are a plain
 * column now — one tappable row each, folded away behind a summary line until
 * you want them.
 */
export function ActionsBlock({
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
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { habits } = useHabits(entry.date);

  const highlight = useMutation({
    mutationFn: () => api.entries.setHighlight(entry.date, !entry.highlight),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', entry.date] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
  });

  const places = entry.locations ?? [];
  const habitsDone = entry.habitsDone ?? [];
  const pocket = pocketMemos(entry);
  const todos = pocket.flatMap((m) => m.actionItems ?? []);
  const todosDone = todos.filter((t) => t.isCompleted).length;
  const pocketSeconds = pocket.reduce((n, m) => n + (m.duration ?? 0), 0);

  // What the collapsed row says, so folding it away doesn't hide the day's state.
  const summary = [
    entry.highlight ? 'Highlighted' : null,
    places.length > 0 ? `${places.length} place${places.length === 1 ? '' : 's'}` : null,
    todos.length > 0 ? `${todosDone}/${todos.length} todos` : null,
    pocket.length > 0 ? `${pocket.length} recording${pocket.length === 1 ? '' : 's'}` : null,
    habits.length > 0 ? `${habitsDone.length}/${habits.length} habits` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const jumpToPocket = () =>
    document
      .getElementById(sectionId('pocket'))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 h-12 text-left hover:bg-gray-50/70 transition-colors"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400 shrink-0">
          Actions
        </span>
        <span className="flex-1 min-w-0 truncate text-xs text-gray-400 text-right">
          {summary || 'Nothing set'}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`shrink-0 text-gray-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-100 animate-fade-up">
          <Row
            icon={Star}
            label="Highlight"
            value={entry.highlight ? 'On' : 'Off'}
            active={entry.highlight}
            onClick={() => highlight.mutate()}
            disabled={highlight.isPending}
            trailing={
              entry.highlight ? <Check size={15} strokeWidth={2.5} className="text-amber-600" /> : null
            }
          />
          <Row
            icon={MapPin}
            label="Places"
            value={
              places.length === 0
                ? 'None'
                : places.length === 1
                  ? places[0].name
                  : `${places.length} places`
            }
            onClick={onOpenPlaces}
          />
          <Row
            icon={ListChecks}
            label="Todos"
            value={todos.length === 0 ? 'None' : `${todosDone}/${todos.length} done`}
            onClick={onOpenTodos}
          />
          <Row
            icon={Mic}
            label="Pocket"
            value={
              pocket.length === 0
                ? 'None'
                : [
                    `${pocket.length} recording${pocket.length === 1 ? '' : 's'}`,
                    formatDuration(pocketSeconds),
                  ]
                    .filter(Boolean)
                    .join(' · ')
            }
            onClick={pocket.length > 0 ? jumpToPocket : undefined}
          />
          {habits.length > 0 && (
            <Row
              glyph="✅"
              label="Habits"
              value={`${habitsDone.length}/${habits.length} today`}
              onClick={onOpenHabits}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  icon: Icon,
  glyph,
  label,
  value,
  onClick,
  active = false,
  disabled = false,
  trailing,
}: {
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  glyph?: string;
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  trailing?: React.ReactNode;
}) {
  const body = (
    <>
      <span className={`shrink-0 w-[18px] flex justify-center ${active ? 'text-amber-500' : 'text-gray-400'}`}>
        {Icon ? (
          <Icon size={16} strokeWidth={2} className={active ? 'fill-current' : ''} />
        ) : (
          <span className="text-base leading-none">{glyph}</span>
        )}
      </span>
      <span className="text-[15px] text-gray-700 shrink-0">{label}</span>
      <span className="flex-1 min-w-0 truncate text-right text-sm text-gray-400">{value}</span>
      {trailing ?? (onClick && <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-gray-300" />)}
    </>
  );

  if (!onClick) {
    return <div className="flex items-center gap-3 px-4 h-12">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 h-12 text-left hover:bg-gray-50/70 active:scale-[0.99] transition-all disabled:opacity-50"
    >
      {body}
    </button>
  );
}

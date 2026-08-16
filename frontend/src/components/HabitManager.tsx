import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus, ChevronLeft } from 'lucide-react';
import type { Habit, PeriodColor } from '@cloudchat/shared';
import { api } from '~/lib/api';
import { PERIOD_COLORS, HABIT_EMOJIS, tone } from '~/lib/periods';
import { Modal, ModalHeader } from '~/components/Modal';

// Create / edit / delete a single habit.
function HabitForm({
  habit,
  onDone,
  onBack,
}: {
  habit?: Habit;
  onDone: () => void;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const editing = Boolean(habit);
  const [name, setName] = useState(habit?.name ?? '');
  const [emoji, setEmoji] = useState(habit?.emoji ?? '🏃');
  const [color, setColor] = useState<PeriodColor>(habit?.color ?? 'green');
  const [weeklyTarget, setWeeklyTarget] = useState(habit?.weeklyTarget ?? 3);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['habits'] });
    qc.invalidateQueries({ queryKey: ['entry'] });
  };

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), emoji, color, weeklyTarget };
      return habit ? api.habits.update(habit.id, body) : api.habits.create(body);
    },
    onSuccess: () => {
      invalidate();
      onDone();
    },
  });

  const remove = useMutation({
    mutationFn: () => api.habits.remove(habit!.id),
    onSuccess: () => {
      invalidate();
      onDone();
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Back"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <h2 className="text-sm font-semibold text-gray-900">{editing ? 'Edit habit' : 'New habit'}</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Name</label>
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none select-none">{emoji}</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Morning run"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Weekly target</label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setWeeklyTarget(n)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  weeklyTarget === n
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {n}
              </button>
            ))}
            <span className="ml-1 text-xs text-gray-400">× / week</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Color</label>
          <div className="flex flex-wrap items-center gap-2">
            {PERIOD_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full ${tone(c).swatch} transition-transform ${
                  color === c ? `ring-2 ring-offset-2 ${tone(c).ring} scale-110` : 'hover:scale-110'
                }`}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Emoji</label>
          <div className="flex flex-wrap items-center gap-1.5">
            {HABIT_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`w-8 h-8 rounded-lg text-lg leading-none flex items-center justify-center transition-colors ${
                  emoji === e ? 'bg-gray-900/5 ring-2 ring-gray-900/10' : 'hover:bg-gray-100'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-6">
        {editing ? (
          <button
            type="button"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 active:scale-[0.97] transition-all disabled:opacity-50"
          >
            <Trash2 size={15} strokeWidth={2} /> Delete
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={!name.trim() || save.isPending}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-40"
        >
          {save.isPending ? 'Saving…' : editing ? 'Save' : 'Add habit'}
        </button>
      </div>
    </div>
  );
}

// Modal that lists habits and drills into the form for create/edit.
export function HabitManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: habits } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const [mode, setMode] = useState<{ view: 'list' } | { view: 'form'; habit?: Habit }>({ view: 'list' });

  const list = habits ?? [];

  return (
    <Modal open={open} onClose={onClose}>
      {mode.view === 'form' ? (
        <HabitForm
          habit={mode.habit}
          onDone={() => setMode({ view: 'list' })}
          onBack={() => setMode({ view: 'list' })}
        />
      ) : (
        <>
          <ModalHeader title="Habits" onClose={onClose} />

          <div className="flex flex-col gap-1 mb-3">
              {list.length === 0 && (
                <p className="text-sm text-gray-400 py-6 text-center">
                  No habits yet. Add one to start tracking.
                </p>
              )}
              {list.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setMode({ view: 'form', habit: h })}
                  className="flex items-center gap-2.5 px-2 py-2 -mx-2 rounded-lg text-left hover:bg-gray-50 transition-colors"
                >
                  <span className={`w-1 self-stretch min-h-5 rounded-full ${tone(h.color).line}`} />
                  <span className="text-base leading-none">{h.emoji ?? '✅'}</span>
                  <span className="font-medium text-gray-800 text-sm truncate">{h.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-gray-400">
                    {h.weeklyTarget}× / week
                  </span>
                </button>
              ))}
            </div>

          <button
            type="button"
            onClick={() => setMode({ view: 'form' })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.97] transition-all"
          >
            <Plus size={15} strokeWidth={2.5} /> New habit
          </button>
        </>
      )}
    </Modal>
  );
}

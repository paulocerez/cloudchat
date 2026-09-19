import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import { Check, Plus, SlidersHorizontal } from 'lucide-react';
import { api } from '~/lib/api';
import { tone } from '~/lib/periods';
import { HabitManager } from '~/components/HabitManager';
import { Sheet, SheetHeader } from '~/components/ui/Sheet';
import { Button } from '~/components/ui/Button';

// The Mon–Sun week containing this day, used to count against weekly targets.
export function weekBounds(date: string) {
  return {
    start: format(startOfWeek(new Date(date), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(new Date(date), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  };
}

export function useHabits(date: string) {
  const { data: habits } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const { start, end } = weekBounds(date);
  const { data: weekEntries } = useQuery({
    queryKey: ['entries', 'week', start],
    queryFn: () => api.entries.range(start, end),
  });
  return {
    habits: habits ?? [],
    weeklyCount: (habitId: string) =>
      (weekEntries ?? []).filter((e) => (e.habitsDone ?? []).includes(habitId)).length,
  };
}

export function HabitSheet({
  date,
  habitsDone,
  open,
  onClose,
}: {
  date: string;
  habitsDone: string[];
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [managerOpen, setManagerOpen] = useState(false);
  const { habits, weeklyCount } = useHabits(date);

  const toggle = useMutation({
    mutationFn: ({ habitId, done }: { habitId: string; done: boolean }) =>
      api.entries.toggleHabit(date, habitId, done),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', date] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
  });

  return (
    <>
      <Sheet open={open} onClose={onClose}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink tracking-[-0.01em]">Habits</h2>
          <Button
            variant="bare"
            size="icon"
            onClick={() => setManagerOpen(true)}
            title="Manage habits"
            aria-label="Manage habits"
            className="-mr-2"
          >
            <SlidersHorizontal size={16} strokeWidth={2} />
          </Button>
        </div>

        {habits.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-faint mb-3">No habits yet</p>
            <Button variant="primary" onClick={() => setManagerOpen(true)}>
              <Plus size={15} strokeWidth={2.5} />
              Track a habit
            </Button>
          </div>
        ) : (
          <div className="flex flex-col">
            {habits.map((h) => {
              const done = habitsDone.includes(h.id);
              const count = weeklyCount(h.id);
              const met = count >= h.weeklyTarget;
              const t = tone(h.color);
              return (
                <button
                  key={h.id}
                  type="button"
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ habitId: h.id, done: !done })}
                  className="flex items-center gap-3 h-12 px-2 -mx-2 rounded-xl text-left hover:bg-hover active:scale-[0.99] transition-all disabled:opacity-60"
                >
                  <span
                    className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center transition-colors ${
                      done ? `${t.line} text-white` : 'bg-field border border-line-strong'
                    }`}
                  >
                    {done && <Check size={15} strokeWidth={3} />}
                  </span>
                  <span
                    className={`text-[15px] font-medium ${done ? 'text-ink' : 'text-secondary'}`}
                  >
                    {h.name}
                  </span>
                  <span
                    className={`ml-auto shrink-0 inline-flex items-center gap-1 text-xs font-medium tabular-nums ${
                      met ? t.text : 'text-faint'
                    }`}
                  >
                    {met && <Check size={12} strokeWidth={3} />}
                    {count}/{h.weeklyTarget} this week
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Sheet>

      <HabitManager open={managerOpen} onClose={() => setManagerOpen(false)} />
    </>
  );
}

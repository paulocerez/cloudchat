import { format } from 'date-fns';
import { Circle, CircleCheck } from 'lucide-react';
import type { JournalEntry } from '@cloudchat/shared';
import { Sheet, SheetHeader } from '~/components/ui/Sheet';
import { pocketMemos } from './shared';

/**
 * Every action item the day's Pocket recordings produced, in one list. Read
 * only — Pocket owns their completion state and there's no endpoint to write
 * it back — but it answers "what did I say I'd do today" without unfolding
 * seven recordings.
 */
export function TodosSheet({
  entry,
  open,
  onClose,
}: {
  entry: JournalEntry;
  open: boolean;
  onClose: () => void;
}) {
  const groups = pocketMemos(entry)
    .map((memo) => ({ memo, items: memo.actionItems ?? [] }))
    .filter((g) => g.items.length > 0);

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const done = groups.reduce((n, g) => n + g.items.filter((i) => i.isCompleted).length, 0);

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader title={total > 0 ? `Todos · ${done}/${total} done` : 'Todos'} onClose={onClose} />

      {groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-faint">
          No action items for this day
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map(({ memo, items }) => (
            <section key={memo.id}>
              <p className="text-xs font-medium text-muted mb-2">
                {format(new Date(memo.timestamp), 'HH:mm')} · {memo.title || 'Recording'}
              </p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5 text-sm">
                    {item.isCompleted ? (
                      <CircleCheck
                        size={16}
                        strokeWidth={2.25}
                        className="mt-[3px] shrink-0 text-ink"
                        aria-hidden
                      />
                    ) : (
                      <Circle
                        size={16}
                        strokeWidth={2.25}
                        className="mt-[3px] shrink-0 text-faint"
                        aria-hidden
                      />
                    )}
                    <span className="min-w-0">
                      <span
                        className={item.isCompleted ? 'text-faint line-through' : 'text-strong'}
                      >
                        {item.title}
                      </span>
                      {item.priority === 'high' && !item.isCompleted && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-300 ml-1.5 align-[1px]">high</span>
                      )}
                      {item.dueDate && (
                        <span className="text-[11px] text-faint ml-1.5 align-[1px]">
                          due {item.dueDate}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Sheet>
  );
}

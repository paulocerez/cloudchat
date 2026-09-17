import { format } from 'date-fns';
import { Check } from 'lucide-react';
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
        <p className="py-6 text-center text-sm text-gray-400">
          No action items for this day
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map(({ memo, items }) => (
            <section key={memo.id}>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">
                {format(new Date(memo.timestamp), 'HH:mm')} · {memo.title || 'Recording'}
              </p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5 text-sm">
                    <span
                      className={`mt-[3px] shrink-0 w-4 h-4 rounded-[5px] border flex items-center justify-center ${
                        item.isCompleted ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
                      }`}
                    >
                      {item.isCompleted && (
                        <Check size={10} strokeWidth={3.5} className="text-white" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={item.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}
                      >
                        {item.title}
                      </span>
                      {item.priority === 'high' && !item.isCompleted && (
                        <span className="text-[11px] text-amber-600 ml-1.5 align-[1px]">high</span>
                      )}
                      {item.dueDate && (
                        <span className="text-[11px] text-gray-400 ml-1.5 align-[1px]">
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

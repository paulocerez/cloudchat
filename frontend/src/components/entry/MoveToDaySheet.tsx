import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { Sheet, SheetHeader } from '~/components/ui/Sheet';
import { Button } from '~/components/ui/Button';

export function MoveToDaySheet({
  open,
  onClose,
  date,
  title,
  label,
  move,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  title: string;
  label: string;
  move: (toDate: string) => Promise<unknown>;
}) {
  const qc = useQueryClient();
  const [moveTo, setMoveTo] = useState(date);
  const m = useMutation({
    mutationFn: () => move(moveTo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', date] });
      qc.invalidateQueries({ queryKey: ['entry', moveTo] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      onClose();
    },
  });

  return (
    <Sheet open={open} onClose={onClose} className="max-w-sm">
      <SheetHeader title={title} onClose={onClose} />
      <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      <input
        type="date"
        value={moveTo}
        onChange={(e) => setMoveTo(e.target.value)}
        className="w-full text-sm text-strong rounded-lg border border-line-strong bg-field px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent"
      />
      <p className="text-xs text-faint mt-2 leading-relaxed">
        It keeps its time of day. If that day has no entry yet, one will be created.
      </p>
      {m.isError && <p className="text-xs text-danger mt-2">Couldn't move it. Try again.</p>}
      <div className="flex items-center justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => m.mutate()}
          disabled={m.isPending || !moveTo || moveTo === date}
        >
          {m.isPending ? 'Moving…' : 'Move'}
        </Button>
      </div>
    </Sheet>
  );
}

// Desktop affordance: the small clock icon that appears on hover. Touch users
// reach the same sheet by long-pressing the item instead.
export function MoveToDayButton({
  date,
  title,
  label,
  move,
  variant = 'ghost',
}: {
  date: string;
  title: string;
  label: string;
  move: (toDate: string) => Promise<unknown>;
  variant?: 'ghost' | 'overlay';
}) {
  const [open, setOpen] = useState(false);

  const btnClass =
    variant === 'overlay'
      ? 'p-1.5 rounded-full bg-black/45 text-white hover:bg-black/70 transition-colors'
      : 'shrink-0 p-1 rounded text-faintest hover:text-strong hover:bg-hover transition-colors';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={title} className={btnClass}>
        <CalendarClock size={variant === 'overlay' ? 13 : 12} strokeWidth={2.5} />
      </button>
      {open && (
        <MoveToDaySheet
          open
          onClose={() => setOpen(false)}
          date={date}
          title={title}
          label={label}
          move={move}
        />
      )}
    </>
  );
}

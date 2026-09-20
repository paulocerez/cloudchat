import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { JournalEntry } from '@cloudchat/shared';
import { api } from '~/lib/api';
import { useToast } from '~/components/ui/Toast';
import { Sheet, SheetHeader } from '~/components/ui/Sheet';
import { Button } from '~/components/ui/Button';

export function EditEntrySheet({
  entry,
  open,
  onClose,
}: {
  entry: JournalEntry;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState(entry.title ?? '');
  const [summary, setSummary] = useState(entry.summary ?? '');

  // Reset the draft each time it opens, so a cancelled edit doesn't linger.
  useEffect(() => {
    if (open) {
      setTitle(entry.title ?? '');
      setSummary(entry.summary ?? '');
    }
  }, [open, entry.title, entry.summary]);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.entries.updateSummary(entry.date, { title: title.trim(), summary: summary.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', entry.date] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      onClose();
      // The sheet closes on save, so without this the write leaves no trace.
      toast('Day saved');
    },
    onError: () => toast("Couldn't save the day", 'error'),
  });

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader title="Edit day" onClose={onClose} />
      <label className="block text-xs font-medium text-muted mb-1">Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Short headline"
        className="w-full text-sm text-strong rounded-md border border-line-strong bg-field px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent"
      />
      <label className="block text-xs font-medium text-muted mb-1">Summary</label>
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={7}
        className="w-full text-sm text-strong leading-relaxed rounded-md border border-line-strong bg-field px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent resize-y"
      />
      <div className="flex items-center justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => mutate()} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Sheet>
  );
}

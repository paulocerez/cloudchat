import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Film, MapPin, Star, WandSparkles } from 'lucide-react';
import type { JournalEntry } from '@cloudchat/shared';
import { api } from '~/lib/api';
import { Sheet } from '~/components/ui/Sheet';
import { Button } from '~/components/ui/Button';

/**
 * The overflow menu behind the header's "…" — and the same sheet the tray's
 * "+" opens. Everything that used to be a row of text buttons stealing the
 * first screenful now lives here.
 */
export function EntryActionsSheet({
  entry,
  open,
  onClose,
  onEditPlaces,
  onTrackHabits,
  onUploadVideo,
}: {
  entry: JournalEntry;
  open: boolean;
  onClose: () => void;
  onEditPlaces: () => void;
  onTrackHabits: () => void;
  onUploadVideo: () => void;
}) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['entry', entry.date] });
    qc.invalidateQueries({ queryKey: ['entries'] });
  };

  const generate = useMutation({
    mutationFn: () => api.summaries.generateDaily(entry.date),
    onSuccess: invalidate,
  });

  const highlight = useMutation({
    mutationFn: () => api.entries.setHighlight(entry.date, !entry.highlight),
    onSuccess: invalidate,
  });

  const run = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <Sheet open={open} onClose={onClose} className="max-w-sm">
      <div className="flex flex-col">
        <Button
          size="row"
          variant="ghost"
          className="text-gray-700"
          disabled={generate.isPending}
          onClick={() => generate.mutate()}
        >
          <WandSparkles size={17} strokeWidth={2} />
          {generate.isPending
            ? 'Generating…'
            : generate.isError
              ? 'Retry summary'
              : entry.summary
                ? 'Regenerate summary'
                : 'Generate summary'}
        </Button>

        <Button
          size="row"
          variant="ghost"
          className={entry.highlight ? 'text-amber-600' : 'text-gray-700'}
          disabled={highlight.isPending}
          onClick={() => highlight.mutate()}
        >
          <Star size={17} strokeWidth={2} className={entry.highlight ? 'fill-current' : ''} />
          {entry.highlight ? 'Remove highlight' : 'Highlight this day'}
        </Button>

        <div className="my-1.5 h-px bg-gray-100" />

        <Button size="row" variant="ghost" className="text-gray-700" onClick={run(onEditPlaces)}>
          <MapPin size={17} strokeWidth={2} />
          Add a place
        </Button>
        <Button size="row" variant="ghost" className="text-gray-700" onClick={run(onTrackHabits)}>
          <span className="text-[17px] leading-none w-[17px] text-center">✅</span>
          Track habits
        </Button>
        <Button size="row" variant="ghost" className="text-gray-700" onClick={run(onUploadVideo)}>
          <Film size={17} strokeWidth={2} />
          Upload a video
        </Button>
      </div>
    </Sheet>
  );
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Film, ImagePlus, MapPin, Pencil, Sprout, WandSparkles } from 'lucide-react';
import type { JournalEntry } from '@cloudchat/shared';
import { api } from '~/lib/api';
import { Sheet } from '~/components/ui/Sheet';
import { Button } from '~/components/ui/Button';

/**
 * The overflow menu behind the header's "…". Everything that used to be a row
 * of text buttons stealing the first screenful lives here; highlight stayed in
 * the header, because it's the one you reach for while reading.
 */
export function EntryActionsSheet({
  entry,
  open,
  onClose,
  onEdit,
  onEditPlaces,
  onTrackHabits,
  onAddPhoto,
  onUploadVideo,
}: {
  entry: JournalEntry;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onEditPlaces: () => void;
  onTrackHabits: () => void;
  onAddPhoto: () => void;
  onUploadVideo: () => void;
}) {
  const qc = useQueryClient();

  const generate = useMutation({
    mutationFn: () => api.summaries.generateDaily(entry.date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', entry.date] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
  });

  const run = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <Sheet open={open} onClose={onClose} className="max-w-sm">
      <div className="flex flex-col">
        <Button size="row" variant="ghost" className="text-ink" onClick={run(onEdit)}>
          <Pencil size={17} strokeWidth={2} />
          Edit title &amp; summary
        </Button>

        <Button
          size="row"
          variant="ghost"
          className="text-ink"
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

        <div className="my-1.5 h-px bg-line" />

        <Button size="row" variant="ghost" className="text-ink" onClick={run(onAddPhoto)}>
          <ImagePlus size={17} strokeWidth={2} />
          Add a photo
        </Button>
        <Button size="row" variant="ghost" className="text-ink" onClick={run(onUploadVideo)}>
          <Film size={17} strokeWidth={2} />
          Add a video
        </Button>
        <Button size="row" variant="ghost" className="text-ink" onClick={run(onEditPlaces)}>
          <MapPin size={17} strokeWidth={2} />
          Add a place
        </Button>
        <Button size="row" variant="ghost" className="text-ink" onClick={run(onTrackHabits)}>
          <Sprout size={17} strokeWidth={2} />
          Track habits
        </Button>
      </div>
    </Sheet>
  );
}

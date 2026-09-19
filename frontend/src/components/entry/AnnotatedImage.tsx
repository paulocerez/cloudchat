import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Pencil } from 'lucide-react';
import type { JournalImage } from '@cloudchat/shared';
import { api } from '~/lib/api';
import { useLongPress } from '~/lib/useLongPress';
import { ImageLightbox } from '~/components/ImageLightbox';
import { Sheet, SheetHeader } from '~/components/ui/Sheet';
import { Button } from '~/components/ui/Button';
import { MenuSheet } from '~/components/ui/MenuSheet';
import { MoveToDaySheet } from './MoveToDaySheet';
import { mediaUrl } from './shared';

export function AnnotatedImage({
  image,
  date,
  className = '',
}: {
  image: JournalImage;
  date: string;
  className?: string;
}) {
  const src = image.url ?? mediaUrl(`/api/media/${image.messageId}/${image.mediaId}`);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [actions, setActions] = useState(false);
  const [moving, setMoving] = useState(false);
  const [draft, setDraft] = useState(image.annotation ?? '');
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.entries.updateImageAnnotation(date, image.id, draft.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', date] });
      setEditing(false);
    },
  });

  const openEditor = () => {
    setDraft(image.annotation ?? '');
    setEditing(true);
  };

  const longPress = useLongPress(() => setActions(true));

  return (
    <div className={`relative group/img overflow-hidden ${className}`} {...longPress}>
      <img
        src={src}
        alt={image.annotation ?? image.caption ?? 'Journal image'}
        loading="lazy"
        draggable={false}
        onClick={() => setZoomed(true)}
        className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover/img:scale-[1.02] [-webkit-touch-callout:none]"
      />
      {image.annotation && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pt-6 pb-2.5">
          <p className="text-white text-xs sm:text-sm font-medium leading-snug drop-shadow">
            {image.annotation}
          </p>
        </div>
      )}
      {/* Hover affordance is desktop-only; a thumb gets here by long-pressing. */}
      <button
        type="button"
        onClick={openEditor}
        aria-label="Annotate image"
        className="hidden sm:block absolute top-2 right-2 p-1.5 rounded-sm bg-black/45 text-white opacity-0 group-hover/img:opacity-100 hover:bg-black/70 transition-opacity"
      >
        <Pencil size={13} strokeWidth={2.5} />
      </button>

      {zoomed && (
        <ImageLightbox
          src={src}
          alt={image.annotation ?? image.caption ?? 'Journal image'}
          caption={image.annotation ?? image.caption}
          onClose={() => setZoomed(false)}
        />
      )}

      <MenuSheet
        open={actions}
        onClose={() => setActions(false)}
        title="Photo"
        items={[
          { icon: Pencil, label: image.annotation ? 'Edit note' : 'Add a note', onSelect: openEditor },
          {
            icon: CalendarClock,
            label: 'Move to another day',
            onSelect: () => setMoving(true),
          },
        ]}
      />

      {moving && (
        <MoveToDaySheet
          open
          onClose={() => setMoving(false)}
          date={date}
          title="Move image"
          label="Move this image to"
          move={(toDate) => api.entries.moveImage(date, image.id, toDate)}
        />
      )}

      <Sheet open={editing} onClose={() => setEditing(false)} className="max-w-md">
        <SheetHeader title="Annotate image" onClose={() => setEditing(false)} />
        <img src={src} alt="" className="w-full max-h-56 object-contain rounded-sm bg-gray-100 mb-3" />
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Add a note for this photo…"
          className="w-full text-sm text-gray-700 leading-relaxed rounded-sm border border-gray-300 bg-white/70 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
        />
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => mutate()} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

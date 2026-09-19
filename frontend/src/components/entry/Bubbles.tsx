import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarClock, MoreHorizontal, Pencil } from 'lucide-react';
import type { JournalImage, JournalVideo, TextMessage, VoiceMemo } from '@cloudchat/shared';
import { api } from '~/lib/api';
import { extractSpotifyLinks, spotifyEmbedUrl, stripSpotifyLinks } from '~/lib/spotify';
import { useLongPress } from '~/lib/useLongPress';
import { Sheet, SheetHeader } from '~/components/ui/Sheet';
import { Button } from '~/components/ui/Button';
import { AnnotatedImage } from './AnnotatedImage';
import { MenuSheet } from '~/components/ui/MenuSheet';
import { MoveToDaySheet, MoveToDayButton } from './MoveToDaySheet';
import { VoicePlayer } from './VoicePlayer';
import { mediaUrl } from './shared';

// An always-visible, very quiet handle. Hover-reveal hid these controls from
// every touch device, and long-press alone is undiscoverable — nothing on
// screen tells you it's there.
const HANDLE =
  'shrink-0 h-7 w-7 flex items-center justify-center rounded-sm text-[#B8B8C2] hover:text-[#241F2E] hover:bg-gray-900/[0.05] active:scale-90 transition-all';

export function MessageBubble({ msg, date }: { msg: TextMessage; date: string }) {
  const time = format(new Date(msg.timestamp), 'HH:mm');
  const spotifyLinks = extractSpotifyLinks(msg.content);
  const text = spotifyLinks.length > 0 ? stripSpotifyLinks(msg.content) : msg.content;
  const [actions, setActions] = useState(false);
  const [moving, setMoving] = useState(false);
  const longPress = useLongPress(() => setActions(true));

  const handle = (
    <button
      type="button"
      onClick={() => setActions(true)}
      aria-label="Message actions"
      className={HANDLE}
    >
      <MoreHorizontal size={15} strokeWidth={2.25} />
    </button>
  );

  return (
    <div
      className={`group flex items-end gap-1 ${msg.fromUser ? 'justify-end animate-slide-right' : 'justify-start animate-slide-left'}`}
    >
      {msg.fromUser && handle}
      <div
        {...longPress}
        className={`max-w-[80%] md:max-w-md rounded-sm px-4 py-3 squish ${
          msg.fromUser
            ? 'bg-[#241F2E] text-white shadow-[0_6px_18px_-6px_rgba(36,31,46,0.45)]'
            : 'surface text-[#241F2E]'
        }`}
      >
        {text && <p className="text-[15px] leading-relaxed">{text}</p>}
        {spotifyLinks.map((link) => (
          <iframe
            key={`${link.kind}:${link.id}`}
            src={spotifyEmbedUrl(link)}
            title="Spotify player"
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className={`w-full rounded-sm border-0 ${text ? 'mt-2' : ''} ${link.kind === 'track' || link.kind === 'episode' ? 'h-[152px]' : 'h-[352px]'}`}
          />
        ))}
        <p className="text-[11px] mt-1 opacity-50">{time}</p>
      </div>
      {!msg.fromUser && handle}

      <MenuSheet
        open={actions}
        onClose={() => setActions(false)}
        title="Message"
        items={[
          { icon: CalendarClock, label: 'Move to another day', onSelect: () => setMoving(true) },
        ]}
      />
      {moving && (
        <MoveToDaySheet
          open
          onClose={() => setMoving(false)}
          date={date}
          title="Move message"
          label="Move this message to"
          move={(toDate) => api.entries.moveMessage(date, msg.id, toDate)}
        />
      )}
    </div>
  );
}

export function VoiceBubble({
  memo,
  date,
  align = 'right',
}: {
  memo: VoiceMemo;
  date: string;
  align?: 'left' | 'right';
}) {
  const time = format(new Date(memo.timestamp), 'HH:mm');
  const src = memo.audioUrl ?? mediaUrl(`/api/media/${memo.messageId}/${memo.mediaId}`);

  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [actions, setActions] = useState(false);
  const [moving, setMoving] = useState(false);
  const [draft, setDraft] = useState(memo.transcription ?? '');
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.entries.updateTranscription(date, memo.id, draft.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', date] });
      setEditing(false);
    },
  });

  const openEditor = () => {
    setDraft(memo.transcription ?? '');
    setEditing(true);
  };

  // The waveform owns its own pointer events, so the long press is bound to the
  // transcript half of the bubble only.
  const longPress = useLongPress(() => setActions(true));

  return (
    <div
      className={`group flex ${align === 'right' ? 'justify-end animate-slide-right' : 'justify-start animate-slide-left'}`}
    >
      <div
        className="max-w-[85%] md:max-w-md rounded-sm surface px-3.5 py-3"
      >
        <VoicePlayer src={src} time={time} />
        <div className="mt-2 flex items-start gap-1.5" {...longPress}>
          {memo.transcription ? (
            <p className="text-[15px] text-[#241F2E] leading-relaxed italic flex-1">
              "{memo.transcription}"
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic flex-1">Transcription pending…</p>
          )}
          <button
            type="button"
            onClick={() => setActions(true)}
            aria-label="Voice memo actions"
            className={HANDLE}
          >
            <MoreHorizontal size={15} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      <MenuSheet
        open={actions}
        onClose={() => setActions(false)}
        title="Voice memo"
        items={[
          { icon: Pencil, label: 'Edit transcription', onSelect: openEditor },
          { icon: CalendarClock, label: 'Move to another day', onSelect: () => setMoving(true) },
        ]}
      />
      {moving && (
        <MoveToDaySheet
          open
          onClose={() => setMoving(false)}
          date={date}
          title="Move voice memo"
          label="Move this voice memo to"
          move={(toDate) => api.entries.moveVoiceMemo(date, memo.id, toDate)}
        />
      )}

      <TranscriptionDialog
        open={editing}
        value={draft}
        onChange={setDraft}
        onSave={() => mutate()}
        onCancel={() => {
          setDraft(memo.transcription ?? '');
          setEditing(false);
        }}
        isSaving={isPending}
      />
    </div>
  );
}

function TranscriptionDialog({
  open,
  value,
  onChange,
  onSave,
  onCancel,
  isSaving,
}: {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  return (
    <Sheet open={open} onClose={onCancel}>
      <SheetHeader title="Edit transcription" onClose={onCancel} />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        autoFocus
        className="w-full text-sm text-gray-700 leading-relaxed rounded-sm border border-gray-300 bg-white/70 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
      />
      <div className="flex items-center justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Sheet>
  );
}

export function ImageBubble({ image, date }: { image: JournalImage; date: string }) {
  const time = format(new Date(image.timestamp), 'HH:mm');
  return (
    <div className="group flex justify-end animate-slide-right">
      <div className="max-w-[80%] md:max-w-md rounded-sm surface overflow-hidden squish">
        <AnnotatedImage image={image} date={date} />
        <div className="px-4 py-2 flex items-end justify-between gap-1">
          <div>
            {image.caption && <p className="text-xs text-gray-600">{image.caption}</p>}
            <p className="text-xs text-gray-400 mt-0.5">{time}</p>
          </div>
          <MoveToDayButton
            date={date}
            title="Move image"
            label="Move this image to"
            move={(toDate) => api.entries.moveImage(date, image.id, toDate)}
          />
        </div>
      </div>
    </div>
  );
}

export function VideoBubble({ video }: { video: JournalVideo }) {
  const time = format(new Date(video.timestamp), 'HH:mm');
  return (
    <div className="flex justify-end animate-slide-right">
      <div className="max-w-[85%] md:max-w-md rounded-sm surface overflow-hidden">
        <video controls preload="metadata" src={video.url} className="w-full bg-black max-h-96" />
        <div className="px-4 py-2">
          {video.caption && <p className="text-xs text-gray-600">{video.caption}</p>}
          <p className="text-xs text-gray-400 mt-0.5">{time}</p>
        </div>
      </div>
    </div>
  );
}

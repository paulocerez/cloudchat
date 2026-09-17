import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Film, Image as ImageIcon, MapPin, MessageSquare, Mic, Music, Plus, Star } from 'lucide-react';
import type { JournalEntry } from '@cloudchat/shared';
import { api } from '~/lib/api';
import { extractSpotifyLinks, stripSpotifyLinks } from '~/lib/spotify';
import pocketLogo from '~/assets/pocket-logo.png';
import { Pill, PillTray } from '~/components/ui/Pill';
import { useHabits } from './HabitSheet';
import { pocketMemos, whatsappMemos, type EntrySection } from './shared';

/**
 * Everything that used to be a stacked card — the map, the habit list, the
 * header's button row — compressed into one wrapping row of chips. This is the
 * whole point of the redesign: the day's content starts above the fold.
 */
export function PropertyTray({
  entry,
  onOpenPlaces,
  onOpenHabits,
  onOpenActions,
  onJump,
}: {
  entry: JournalEntry;
  onOpenPlaces: () => void;
  onOpenHabits: () => void;
  onOpenActions: () => void;
  onJump: (section: EntrySection) => void;
}) {
  const qc = useQueryClient();
  const { habits } = useHabits(entry.date);

  const highlight = useMutation({
    mutationFn: () => api.entries.setHighlight(entry.date, !entry.highlight),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', entry.date] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
  });

  const places = entry.locations ?? [];
  const habitsDone = entry.habitsDone ?? [];
  const songs = entry.messages.flatMap((m) => extractSpotifyLinks(m.content)).length;
  const messages = entry.messages.filter((m) => stripSpotifyLinks(m.content).length > 0).length;
  const memos = whatsappMemos(entry).length;
  const images = entry.images.length;
  const videos = entry.videos?.length ?? 0;
  const pocket = pocketMemos(entry);
  const pocketTasks = pocket.reduce((n, m) => n + (m.actionItems?.length ?? 0), 0);

  const counts: { section: EntrySection; icon: typeof Music; n: number }[] = [
    { section: 'messages', icon: MessageSquare, n: messages },
    { section: 'images', icon: ImageIcon, n: images },
    { section: 'memos', icon: Mic, n: memos },
    { section: 'videos', icon: Film, n: videos },
    { section: 'songs', icon: Music, n: songs },
  ];

  return (
    <PillTray className="mt-3.5">
      <Pill
        icon={Star}
        label={entry.highlight ? 'Highlighted' : 'Highlight'}
        active={entry.highlight}
        onClick={() => highlight.mutate()}
        className={
          entry.highlight
            ? 'bg-amber-100 text-amber-700 ring-amber-200/70 [&_svg]:fill-current'
            : 'text-gray-500'
        }
      />

      <Pill
        icon={MapPin}
        label={
          places.length > 0
            ? places.length === 1
              ? places[0].name
              : `${places.length} places`
            : 'No places'
        }
        onClick={onOpenPlaces}
        active={places.length > 0}
        className={places.length > 0 ? 'max-w-[10rem]' : 'text-gray-400'}
        title={places.map((p) => p.name).join(', ')}
      />

      {habits.length > 0 && (
        <Pill
          label={<span className="text-base leading-none">✅</span>}
          value={`${habitsDone.length}/${habits.length}`}
          onClick={onOpenHabits}
          active={habitsDone.length > 0}
          className={habitsDone.length === habits.length ? 'text-emerald-700' : ''}
          title="Habits"
        />
      )}

      {counts
        .filter((c) => c.n > 0)
        .map((c) => (
          <Pill
            key={c.section}
            icon={c.icon}
            label={String(c.n)}
            onClick={() => onJump(c.section)}
            className="text-gray-500"
            title={c.section}
          />
        ))}

      {pocket.length > 0 && (
        <Pill
          label={
            <span className="inline-flex items-center gap-1.5">
              <img src={pocketLogo} alt="" className="h-3 w-auto opacity-60" />
              {pocket.length}
              {pocketTasks > 0 && <span className="text-gray-400">· {pocketTasks} tasks</span>}
            </span>
          }
          onClick={() => onJump('pocket')}
          className="text-gray-500"
          title="Pocket recordings"
        />
      )}

      <Pill
        icon={Plus}
        onClick={onOpenActions}
        className="bg-transparent ring-0 shadow-none text-gray-400 hover:bg-white px-2"
        title="Add to this day"
      />
    </PillTray>
  );
}

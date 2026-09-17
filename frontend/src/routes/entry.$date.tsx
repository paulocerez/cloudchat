import { useState, useRef, useMemo } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '~/lib/api';
import { formatEntryDate } from '~/lib/utils';
import { extractSpotifyLinks, spotifyEmbedUrl, stripSpotifyLinks, type SpotifyLink } from '~/lib/spotify';
import { staticMapUrl } from '~/lib/mapbox';
import { MapPin, Star, WandSparkles, List, LayoutGrid, MessageSquare, Image as ImageIcon, Mic, Music, Film, Upload, Pencil, X, Plus, Check, SlidersHorizontal, CalendarClock, Play, Pause, ChevronDown } from 'lucide-react';
import type { JournalEntry, TextMessage, VoiceMemo, JournalImage, JournalVideo, Habit } from '@cloudchat/shared';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { tone } from '~/lib/periods';
import { HabitManager } from '~/components/HabitManager';
import { Modal, ModalHeader } from '~/components/Modal';
import { ImageLightbox } from '~/components/ImageLightbox';
import { PocketSummary } from '~/components/PocketSummary';
import { rootRoute } from './__root';

export const entryDateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entry/$date',
  component: EntryPage,
});

type ViewMode = 'timeline' | 'organized';

function EntryPage() {
  const { date } = entryDateRoute.useParams();
  const [view, setView] = useState<ViewMode>(
    () => (localStorage.getItem('entryViewMode') as ViewMode) || 'timeline'
  );
  const setViewMode = (v: ViewMode) => {
    setView(v);
    localStorage.setItem('entryViewMode', v);
  };
  const { data: entry, isLoading, isError } = useQuery({
    queryKey: ['entry', date],
    queryFn: () => api.entries.get(date),
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-gray-400 animate-fade-up">
        <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin-slow" />
        <span className="text-sm">Loading…</span>
      </div>
    );

  if (isError || !entry)
    return (
      <div className="text-center py-8 animate-fade-up">
        <p className="text-gray-500 text-sm">Entry not found</p>
        <Link to="/" className="text-gray-900 underline text-sm mt-2 block">
          ← Back to timeline
        </Link>
      </div>
    );

  return (
    <>
      {/* Sticky translucent header — pins below the nav, with a scroll-edge
          fade so content dissolves under the glass. Lives outside the
          transformed wrapper so position: sticky resolves against the viewport. */}
      <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 md:-mx-8 -mt-8 px-4 sm:px-6 md:px-8 pt-8 pb-3 bg-white/70 backdrop-blur-xl backdrop-saturate-150 glass-surface [mask-image:linear-gradient(to_bottom,black_calc(100%-14px),transparent)]">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-900 text-sm mb-4 transition-all duration-150 hover:-translate-x-0.5"
        >
          ← Timeline
        </Link>
        {entry.title && (
          <p className="text-xs font-medium tracking-wide uppercase text-gray-400 mb-1">
            {entry.title}
          </p>
        )}
        <h1 className="text-2xl font-bold text-gray-900 tracking-[-0.02em] leading-[1.1] [font-optical-sizing:auto]">
          {formatEntryDate(entry.date)}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-3.5">
          <EditSummaryButton entry={entry} />
          <VideoUploader date={entry.date} />
          <GenerateSummaryButton date={entry.date} hasSummary={Boolean(entry.summary)} />
          <HighlightToggle date={entry.date} highlight={Boolean(entry.highlight)} />
        </div>
      </div>
      <div className="animate-fade-up pt-4">
        {entry.summary && (
          <p className="text-sm text-gray-600 leading-relaxed mb-4">{entry.summary}</p>
        )}
        <LocationCard entry={entry} />
        <HabitTracker date={entry.date} habitsDone={entry.habitsDone ?? []} />
        <div className="flex justify-end mb-3">
          <ViewToggle view={view} onChange={setViewMode} />
        </div>
        {view === 'timeline' ? <EntryContent entry={entry} /> : <OrganizedContent entry={entry} />}
        <MessageComposer date={entry.date} />
        <PocketSection entry={entry} />
      </div>
    </>
  );
}

function MessageComposer({ date }: { date: string }) {
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.entries.addMessage(date, content.trim()),
    onSuccess: () => {
      setContent('');
      qc.invalidateQueries({ queryKey: ['entry', date] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (content.trim()) mutate();
      }}
      className="mt-6 flex items-center gap-2"
    >
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add something you forgot…"
        className="flex-1 text-sm text-gray-700 rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      />
      <button
        type="submit"
        disabled={!content.trim() || isPending}
        className="shrink-0 inline-flex items-center gap-1 px-3.5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-50"
      >
        {isPending ? 'Adding…' : 'Add'}
      </button>
    </form>
  );
}

function HabitTracker({ date, habitsDone }: { date: string; habitsDone: string[] }) {
  const qc = useQueryClient();
  const [managerOpen, setManagerOpen] = useState(false);

  const { data: habits } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });

  // The Mon–Sun week containing this day, used to count against weekly targets.
  const weekStart = format(startOfWeek(new Date(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const { data: weekEntries } = useQuery({
    queryKey: ['entries', 'week', weekStart],
    queryFn: () => api.entries.range(weekStart, weekEnd),
  });

  const toggle = useMutation({
    mutationFn: ({ habitId, done }: { habitId: string; done: boolean }) =>
      api.entries.toggleHabit(date, habitId, done),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', date] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
  });

  const list = habits ?? [];
  if (list.length === 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => setManagerOpen(true)}
          className="mb-4 flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} /> Track a habit
        </button>
        <HabitManager open={managerOpen} onClose={() => setManagerOpen(false)} />
      </>
    );
  }

  const weeklyCount = (habitId: string) =>
    (weekEntries ?? []).filter((e) => (e.habitsDone ?? []).includes(habitId)).length;

  return (
    <div className="mb-4 rounded-2xl bg-white ring-1 ring-gray-900/[0.06] shadow-sm p-3.5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Habits</h2>
        <button
          type="button"
          onClick={() => setManagerOpen(true)}
          title="Manage habits"
          className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
        >
          <SlidersHorizontal size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {list.map((h) => {
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
              className="flex items-center gap-2.5 px-2 py-1.5 -mx-2 rounded-lg text-left hover:bg-white transition-colors disabled:opacity-60"
            >
              <span
                className={`w-5 h-5 shrink-0 rounded-md flex items-center justify-center transition-colors ${
                  done ? `${t.line} text-white` : 'bg-white border border-gray-300'
                }`}
              >
                {done && <Check size={13} strokeWidth={3} />}
              </span>
              <span className="text-base leading-none">{h.emoji ?? '✅'}</span>
              <span className={`text-sm font-medium ${done ? 'text-gray-900' : 'text-gray-600'}`}>
                {h.name}
              </span>
              <span
                className={`ml-auto shrink-0 inline-flex items-center gap-1 text-xs font-medium ${
                  met ? t.text : 'text-gray-400'
                }`}
              >
                {met && <Check size={12} strokeWidth={3} />}
                {count}/{h.weeklyTarget} this week
              </span>
            </button>
          );
        })}
      </div>

      <HabitManager open={managerOpen} onClose={() => setManagerOpen(false)} />
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const opts: { mode: ViewMode; Icon: typeof List; label: string }[] = [
    { mode: 'timeline', Icon: List, label: 'Timeline view' },
    { mode: 'organized', Icon: LayoutGrid, label: 'Organized view' },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-100">
      {opts.map(({ mode, Icon, label }) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          aria-label={label}
          aria-pressed={view === mode}
          className={`p-1.5 rounded-md transition-colors ${
            view === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Icon size={16} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

function EditSummaryButton({ entry }: { entry: JournalEntry }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(entry.title ?? '');
  const [summary, setSummary] = useState(entry.summary ?? '');

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.entries.updateSummary(entry.date, { title: title.trim(), summary: summary.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', entry.date] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      setOpen(false);
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTitle(entry.title ?? '');
          setSummary(entry.summary ?? '');
          setOpen(true);
        }}
        className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-[0.97] transition-all"
      >
        <Pencil size={13} strokeWidth={2.5} />
        Edit
      </button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalHeader title="Edit day summary" onClose={() => setOpen(false)} />
        <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short headline"
          className="w-full text-sm text-gray-700 rounded-lg border border-gray-300 bg-white/70 px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
        <label className="block text-xs font-medium text-gray-500 mb-1">Summary</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={8}
          className="w-full text-sm text-gray-700 leading-relaxed rounded-lg border border-gray-300 bg-white/70 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
        />
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-3.5 py-1.5 rounded-lg text-gray-500 text-sm font-medium hover:bg-gray-500/10 active:scale-[0.97] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutate()}
            disabled={isPending}
            className="px-3.5 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </>
  );
}

function GenerateSummaryButton({ date, hasSummary }: { date: string; hasSummary: boolean }) {
  const qc = useQueryClient();
  const { mutate, isPending, isError } = useMutation({
    mutationFn: () => api.summaries.generateDaily(date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', date] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
  });
  return (
    <button
      type="button"
      onClick={() => mutate()}
      disabled={isPending}
      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-[0.97] transition-all disabled:opacity-50"
    >
      <WandSparkles size={13} strokeWidth={2.5} />
      {isPending ? 'Generating…' : isError ? 'Retry' : hasSummary ? 'Regenerate' : 'Generate summary'}
    </button>
  );
}

function HighlightToggle({ date, highlight }: { date: string; highlight: boolean }) {
  const qc = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.entries.setHighlight(date, !highlight),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', date] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
  });
  return (
    <button
      type="button"
      onClick={() => mutate()}
      disabled={isPending}
      aria-pressed={highlight}
      className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium active:scale-[0.97] transition-all disabled:opacity-50 ${
        highlight
          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
      }`}
    >
      <Star size={13} strokeWidth={2.5} className={highlight ? 'fill-current' : ''} />
      {highlight ? 'Highlighted' : 'Highlight'}
    </button>
  );
}

function LocationCard({ entry }: { entry: JournalEntry }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const locations = entry.locations ?? [];
  const scanned = Boolean(entry.locationsScannedAt);
  const mapUrl = staticMapUrl(locations);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['entry', entry.date] });
    qc.invalidateQueries({ queryKey: ['entries'] });
  };

  const add = useMutation({
    mutationFn: () => api.entries.addLocation(entry.date, name.trim()),
    onSuccess: () => {
      setName('');
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (locName: string) => api.entries.removeLocation(entry.date, locName),
    onSuccess: invalidate,
  });

  const status = scanned
    ? locations.length > 0
      ? `Scanned ${format(new Date(entry.locationsScannedAt!), 'MMM d, HH:mm')}`
      : `Scanned ${format(new Date(entry.locationsScannedAt!), 'MMM d, HH:mm')} · none found`
    : 'Not scanned yet';

  return (
    <div className="mb-6 rounded-2xl bg-white ring-1 ring-gray-900/[0.06] shadow-sm overflow-hidden animate-fade-up">
      {mapUrl && <img src={mapUrl} alt="Map of places mentioned" className="w-full block" />}
      <div className="px-3 py-2.5 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <MapPin size={12} strokeWidth={2.5} className="text-gray-400" />
          <span className="text-xs font-medium tracking-wide uppercase text-gray-400">
            Locations
          </span>
          <span
            className={`ml-auto inline-flex items-center gap-1 text-xs font-medium ${
              scanned ? 'text-emerald-600' : 'text-gray-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${scanned ? 'bg-emerald-500' : 'bg-gray-300'}`}
            />
            {status}
          </span>
        </div>

        {locations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {locations.map((loc) => (
              <span
                key={loc.name}
                className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium"
              >
                <MapPin size={12} strokeWidth={2.5} />
                {loc.name}
                <button
                  type="button"
                  onClick={() => remove.mutate(loc.name)}
                  disabled={remove.isPending}
                  aria-label={`Remove ${loc.name}`}
                  className="p-0.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) add.mutate();
          }}
          className="flex items-center gap-1.5"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add a location…"
            className="flex-1 text-xs text-gray-700 rounded-lg border border-gray-300 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!name.trim() || add.isPending}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-50"
          >
            <Plus size={13} strokeWidth={2.5} />
            {add.isPending ? 'Adding…' : 'Add'}
          </button>
        </form>
        {add.isError && (
          <p className="text-xs text-red-500">Couldn't find that place. Try a more specific name.</p>
        )}
      </div>
    </div>
  );
}

function EntryContent({ entry }: { entry: JournalEntry }) {
  type Item =
    | { kind: 'message'; data: TextMessage }
    | { kind: 'voice'; data: VoiceMemo }
    | { kind: 'image'; data: JournalImage }
    | { kind: 'video'; data: JournalVideo };

  // Pocket recordings get their own block at the bottom of the page.
  const items: Item[] = [
    ...entry.messages.map((m: TextMessage): Item => ({ kind: 'message', data: m })),
    ...whatsappMemos(entry).map((v: VoiceMemo): Item => ({ kind: 'voice', data: v })),
    ...entry.images.map((img: JournalImage): Item => ({ kind: 'image', data: img })),
    ...(entry.videos ?? []).map((v: JournalVideo): Item => ({ kind: 'video', data: v })),
  ].sort((a, b) => a.data.timestamp.localeCompare(b.data.timestamp));

  if (items.length === 0) {
    return <p className="text-gray-400 text-sm italic">No content for this day.</p>;
  }

  return (
    <div className="space-y-2 stagger">
      {items.map((item) => {
        if (item.kind === 'message') return <MessageBubble key={item.data.id} msg={item.data} date={entry.date} />;
        if (item.kind === 'voice') return <VoiceBubble key={item.data.id} memo={item.data} date={entry.date} />;
        if (item.kind === 'image') return <ImageBubble key={item.data.id} image={item.data} date={entry.date} />;
        if (item.kind === 'video') return <VideoBubble key={item.data.id} video={item.data} />;
      })}
    </div>
  );
}

function OrganizedContent({ entry }: { entry: JournalEntry }) {
  const songs: SpotifyLink[] = entry.messages.flatMap((m) => extractSpotifyLinks(m.content));
  const textMessages = entry.messages.filter((m) => stripSpotifyLinks(m.content).length > 0);

  const videos = entry.videos ?? [];
  // Pocket recordings get their own block at the bottom of the page.
  const memos = whatsappMemos(entry);
  const isEmpty =
    songs.length === 0 &&
    entry.images.length === 0 &&
    memos.length === 0 &&
    videos.length === 0 &&
    textMessages.length === 0;

  if (isEmpty) return <p className="text-gray-400 text-sm italic">No content for this day.</p>;

  return (
    <div className="space-y-8 stagger">
      {textMessages.length > 0 && (
        <Section icon={MessageSquare} title="Messages" count={textMessages.length}>
          <div className="space-y-2">
            {textMessages.map((m) => (
              <div key={m.id} className="rounded-xl bg-gray-100 text-gray-700 px-4 py-2.5">
                <p className="text-sm leading-relaxed">{stripSpotifyLinks(m.content)}</p>
                <p className="text-xs mt-1 text-gray-400">{format(new Date(m.timestamp), 'HH:mm')}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {entry.images.length > 0 && (
        <Section icon={ImageIcon} title="Images" count={entry.images.length}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {entry.images.map((img) => (
              <AnnotatedImage
                key={img.id}
                image={img}
                date={entry.date}
                className="aspect-square rounded-xl bg-gray-100"
              />
            ))}
          </div>
        </Section>
      )}

      {videos.length > 0 && (
        <Section icon={Film} title="Videos" count={videos.length}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {videos.map((video) => (
              <video
                key={video.id}
                controls
                preload="metadata"
                src={video.url}
                className="w-full rounded-xl bg-black"
              />
            ))}
          </div>
        </Section>
      )}

      {memos.length > 0 && (
        <Section icon={Mic} title="Voice memos" count={memos.length}>
          <div className="space-y-2">
            {memos.map((memo) => (
              <VoiceBubble key={memo.id} memo={memo} date={entry.date} align="left" />
            ))}
          </div>
        </Section>
      )}

      {songs.length > 0 && (
        <Section icon={Music} title="Songs" count={songs.length}>
          <div className="space-y-2">
            {songs.map((link) => (
              <iframe
                key={`${link.kind}:${link.id}`}
                src={spotifyEmbedUrl(link)}
                title="Spotify player"
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                className={`w-full rounded-xl border-0 ${link.kind === 'track' || link.kind === 'episode' ? 'h-[152px]' : 'h-[352px]'}`}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Pocket AI ───────────────────────────────────────────────
// Recordings from the Pocket device land in voiceMemos with source: 'pocket'.
// They carry their own title, summary and action items, so they're shown in a
// dedicated block at the foot of the page rather than mixed into the timeline.
function isPocket(memo: VoiceMemo): boolean {
  return memo.source === 'pocket';
}

function whatsappMemos(entry: JournalEntry): VoiceMemo[] {
  return entry.voiceMemos.filter((m) => !isPocket(m));
}

// Recordings run to the hour, so show h:mm rather than a bare minute count.
function formatDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return m > 0 ? `${m} min` : '<1 min';
}

function PocketSection({ entry }: { entry: JournalEntry }) {
  const recordings = entry.voiceMemos
    .filter(isPocket)
    .slice()
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (recordings.length === 0) return null;

  const tasks = recordings.reduce((n, m) => n + (m.actionItems?.length ?? 0), 0);

  return (
    <section className="mt-10 pt-6 border-t border-gray-100 animate-fade-up">
      {/* Matches the Section headers used elsewhere on the page. */}
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-xs font-medium tracking-wide uppercase text-gray-400">Pocket</h2>
        <span className="text-xs text-gray-300">
          {recordings.length} recording{recordings.length === 1 ? '' : 's'}
          {tasks > 0 && ` · ${tasks} action item${tasks === 1 ? '' : 's'}`}
        </span>
      </div>
      {/* One hairline-separated list rather than 7 boxes — at a recording an
          hour, stacked cards turn the foot of the page into a wall. */}
      <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
        {recordings.map((memo) => (
          <PocketCard key={memo.id} memo={memo} date={entry.date} />
        ))}
      </div>
    </section>
  );
}

// Collapsed a recording shows only what's scannable — time, title, and the
// tasks it produced. The summary and hour-long transcript stay folded away.
function PocketCard({ memo, date }: { memo: VoiceMemo; date: string }) {
  const [open, setOpen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const time = format(new Date(memo.timestamp), 'HH:mm');
  const duration = formatDuration(memo.duration);
  const items = memo.actionItems ?? [];
  // Signed Pocket audio URLs expire, so the backend mints a fresh one per play.
  const src = `${import.meta.env.VITE_API_URL ?? ''}/api/media/pocket/${memo.pocketRecordingId ?? memo.mediaId}`;

  return (
    <article className="group">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50/70 transition-colors duration-150"
      >
        <span className="shrink-0 w-11 pt-0.5 text-xs tabular-nums text-gray-400">{time}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-gray-900 leading-snug">
            {memo.title || 'Recording'}
          </span>
          <span className="block text-xs text-gray-400 mt-0.5">
            {duration}
            {items.length > 0 && ` · ${items.length} action item${items.length === 1 ? '' : 's'}`}
          </span>
        </span>
        <ChevronDown
          size={15}
          strokeWidth={2}
          className={`shrink-0 mt-0.5 text-gray-300 group-hover:text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Action items are the payload of a recording — always visible, indented
          to line up with the title above. */}
      {items.length > 0 && (
        <ul className="px-4 pb-3 pl-[4.25rem] space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <span
                className={`mt-[3px] shrink-0 w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center ${
                  item.isCompleted ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
                }`}
              >
                {item.isCompleted && <Check size={9} strokeWidth={3.5} className="text-white" />}
              </span>
              <span className="min-w-0">
                <span className={item.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}>
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
                {open && item.context && (
                  <span className="block text-xs text-gray-400 leading-relaxed mt-0.5">
                    {item.context}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="px-4 pb-4 pl-[4.25rem] space-y-3 animate-fade-up">
          {/* No trailing clock label — the row header above already shows it,
              and next to the elapsed counter it reads as a duration. */}
          <VoicePlayer src={src} time="" />

          {memo.summaryMarkdown && <PocketSummary markdown={memo.summaryMarkdown} />}

          {memo.bulletPoints && memo.bulletPoints.length > 0 && (
            <ul className="space-y-1.5">
              {memo.bulletPoints.map((point, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
                  <span className="text-gray-300 select-none">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}

          {memo.tags && memo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {memo.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            {memo.transcription && (
              <button
                type="button"
                onClick={() => setShowTranscript((v) => !v)}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                {showTranscript ? 'Hide transcript' : 'Show transcript'}
              </button>
            )}
            {memo.language && <span className="text-xs text-gray-300">{memo.language}</span>}
            <span className="ml-auto">
              <MoveToDayButton
                date={date}
                title="Move recording"
                label="Move this recording to"
                move={(toDate) => api.entries.moveVoiceMemo(date, memo.id, toDate)}
              />
            </span>
          </div>

          {showTranscript && memo.transcription && (
            <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto pr-1">
              {memo.transcription}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function Section({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: typeof List;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} strokeWidth={2} className="text-gray-400" />
        <h2 className="text-xs font-medium tracking-wide uppercase text-gray-400">{title}</h2>
        <span className="text-xs text-gray-300">{count}</span>
      </div>
      {children}
    </section>
  );
}

function MessageBubble({ msg, date }: { msg: TextMessage; date: string }) {
  const time = format(new Date(msg.timestamp), 'HH:mm');
  const spotifyLinks = extractSpotifyLinks(msg.content);
  const text = spotifyLinks.length > 0 ? stripSpotifyLinks(msg.content) : msg.content;
  return (
    <div
      className={`group flex items-end gap-1 ${msg.fromUser ? 'justify-end animate-slide-right' : 'justify-start animate-slide-left'}`}
    >
      {msg.fromUser && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MoveToDayButton
            date={date}
            title="Move message"
            label="Move this message to"
            move={(toDate) => api.entries.moveMessage(date, msg.id, toDate)}
          />
        </div>
      )}
      <div
        className={`max-w-xs md:max-w-md rounded-2xl px-4 py-2.5 transition-transform duration-150 hover:scale-[1.01] ${
          msg.fromUser
            ? 'bg-gray-900 text-white rounded-br-sm shadow-sm'
            : 'bg-gray-100 text-gray-700 rounded-bl-sm'
        }`}
      >
        {text && <p className="text-sm leading-relaxed">{text}</p>}
        {spotifyLinks.map((link) => (
          <iframe
            key={`${link.kind}:${link.id}`}
            src={spotifyEmbedUrl(link)}
            title="Spotify player"
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className={`w-full rounded-xl border-0 ${text ? 'mt-2' : ''} ${link.kind === 'track' || link.kind === 'episode' ? 'h-[152px]' : 'h-[352px]'}`}
          />
        ))}
        <p className="text-xs mt-1 text-gray-400">{time}</p>
      </div>
      {!msg.fromUser && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MoveToDayButton
            date={date}
            title="Move message"
            label="Move this message to"
            move={(toDate) => api.entries.moveMessage(date, msg.id, toDate)}
          />
        </div>
      )}
    </div>
  );
}

// Deterministic waveform heights (0..1) seeded off the audio URL, so each memo
// gets a distinct-but-stable shape without decoding the audio.
function makeWaveform(seed: string, count = 42): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return h / 4294967296;
  };
  return Array.from({ length: count }, () => 0.28 + rand() * 0.72);
}

function fmtDuration(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// WhatsApp-style voice player: round play/pause control, an interactive
// waveform with a draggable scrubber, and an elapsed/total time readout.
function VoicePlayer({ src, time }: { src: string; time: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const bars = useMemo(() => makeWaveform(src), [src]);

  const fraction = duration > 0 ? Math.min(current / duration, 1) : 0;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  };

  const seekToClientX = (clientX: number) => {
    const track = trackRef.current;
    const a = audioRef.current;
    if (!track || !a || !Number.isFinite(duration) || duration <= 0) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setCurrent(ratio * duration);
  };

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        className="shrink-0 w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 active:scale-95 transition-all"
      >
        {playing ? (
          <Pause size={16} strokeWidth={2.5} className="fill-current" />
        ) : (
          <Play size={16} strokeWidth={2.5} className="fill-current translate-x-[1px]" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div
          ref={trackRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setScrubbing(true);
            seekToClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (scrubbing) seekToClientX(e.clientX);
          }}
          onPointerUp={() => setScrubbing(false)}
          onPointerCancel={() => setScrubbing(false)}
          className="relative flex items-center gap-[2px] h-7 cursor-pointer touch-none"
        >
          {bars.map((v, i) => {
            const played = fraction >= (i + 0.5) / bars.length;
            return (
              <span
                key={i}
                className={`flex-1 rounded-full transition-colors ${played ? 'bg-gray-900' : 'bg-gray-300'}`}
                style={{ height: `${Math.round(v * 100)}%` }}
              />
            );
          })}
          <span
            className="absolute top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-900 shadow-sm ring-2 ring-gray-50"
            style={{ left: `${fraction * 100}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] font-medium text-gray-400 tabular-nums">
            {fmtDuration(playing || current > 0 ? current : duration)}
          </span>
          <span className="text-[11px] text-gray-300">{time}</span>
        </div>
      </div>

      <span className="shrink-0 w-7 h-7 rounded-full bg-violet-100 text-violet-500 flex items-center justify-center self-start">
        <Mic size={13} strokeWidth={2.5} />
      </span>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
      />
    </div>
  );
}

function VoiceBubble({
  memo,
  date,
  align = 'right',
}: {
  memo: VoiceMemo;
  date: string;
  align?: 'left' | 'right';
}) {
  const time = format(new Date(memo.timestamp), 'HH:mm');
  const src =
    memo.audioUrl ??
    `${import.meta.env.VITE_API_URL ?? ''}/api/media/${memo.messageId}/${memo.mediaId}`;

  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memo.transcription ?? '');
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.entries.updateTranscription(date, memo.id, draft.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', date] });
      setEditing(false);
    },
  });

  return (
    <div className={`flex ${align === 'right' ? 'justify-end animate-slide-right' : 'justify-start animate-slide-left'}`}>
      <div className={`max-w-xs md:max-w-md rounded-2xl ${align === 'right' ? 'rounded-br-sm' : 'rounded-bl-sm'} bg-gray-50 border border-gray-200 px-3 py-2.5 hover:border-gray-300 transition-colors duration-150`}>
        <VoicePlayer src={src} time={time} />
        <div className="mt-2 flex items-start gap-1.5">
          {memo.transcription ? (
            <p className="text-sm text-gray-700 leading-relaxed italic flex-1">
              "{memo.transcription}"
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic flex-1">Transcription pending…</p>
          )}
          <button
            type="button"
            onClick={() => {
              setDraft(memo.transcription ?? '');
              setEditing(true);
            }}
            aria-label="Edit transcription"
            className="shrink-0 p-1 rounded text-gray-300 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Pencil size={12} strokeWidth={2.5} />
          </button>
          <MoveToDayButton
            date={date}
            title="Move voice memo"
            label="Move this voice memo to"
            move={(toDate) => api.entries.moveVoiceMemo(date, memo.id, toDate)}
          />
        </div>
      </div>
      {editing && (
        <TranscriptionDialog
          value={draft}
          onChange={setDraft}
          onSave={() => mutate()}
          onCancel={() => {
            setDraft(memo.transcription ?? '');
            setEditing(false);
          }}
          isSaving={isPending}
        />
      )}
    </div>
  );
}

function MoveToDayButton({
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
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [moveTo, setMoveTo] = useState(date);
  const m = useMutation({
    mutationFn: () => move(moveTo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', date] });
      qc.invalidateQueries({ queryKey: ['entry', moveTo] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      setOpen(false);
    },
  });

  const btnClass =
    variant === 'overlay'
      ? 'p-1.5 rounded-full bg-black/45 text-white opacity-0 group-hover/img:opacity-100 hover:bg-black/70 transition-opacity'
      : 'shrink-0 p-1 rounded text-gray-300 hover:text-gray-700 hover:bg-gray-100 transition-colors';

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMoveTo(date);
          setOpen(true);
        }}
        aria-label={title}
        className={btnClass}
      >
        <CalendarClock size={variant === 'overlay' ? 13 : 12} strokeWidth={2.5} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} className="max-w-sm">
        <ModalHeader title={title} onClose={() => setOpen(false)} />
        <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
        <input
          type="date"
          value={moveTo}
          onChange={(e) => setMoveTo(e.target.value)}
          className="w-full text-sm text-gray-700 rounded-lg border border-gray-300 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
          It keeps its time of day. If that day has no entry yet, one will be created.
        </p>
        {m.isError && <p className="text-xs text-rose-500 mt-2">Couldn't move it. Try again.</p>}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-3.5 py-1.5 rounded-lg text-gray-500 text-sm font-medium hover:bg-gray-500/10 active:scale-[0.97] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => m.mutate()}
            disabled={m.isPending || !moveTo || moveTo === date}
            className="px-3.5 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-40"
          >
            {m.isPending ? 'Moving…' : 'Move'}
          </button>
        </div>
      </Modal>
    </>
  );
}

function TranscriptionDialog({
  value,
  onChange,
  onSave,
  onCancel,
  isSaving,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  return (
    <Modal open onClose={onCancel}>
      <ModalHeader title="Edit transcription" onClose={onCancel} />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        autoFocus
        className="w-full text-sm text-gray-700 leading-relaxed rounded-lg border border-gray-300 bg-white/70 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
      />
      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-3.5 py-1.5 rounded-lg text-gray-500 text-sm font-medium hover:bg-gray-500/10 active:scale-[0.97] transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="px-3.5 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}

function ImageBubble({ image, date }: { image: JournalImage; date: string }) {
  const time = format(new Date(image.timestamp), 'HH:mm');
  return (
    <div className="flex justify-end animate-slide-right">
      <div className="max-w-xs md:max-w-md rounded-2xl rounded-br-sm bg-gray-50 border border-gray-200 overflow-hidden hover:border-gray-300 transition-all duration-150 hover:shadow-sm">
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

function VideoBubble({ video }: { video: JournalVideo }) {
  const time = format(new Date(video.timestamp), 'HH:mm');
  return (
    <div className="flex justify-end animate-slide-right">
      <div className="max-w-xs md:max-w-md rounded-2xl rounded-br-sm bg-gray-50 border border-gray-200 overflow-hidden hover:border-gray-300 transition-all duration-150 hover:shadow-sm">
        <video
          controls
          preload="metadata"
          src={video.url}
          className="w-full bg-black max-h-96"
        />
        <div className="px-4 py-2">
          {video.caption && <p className="text-xs text-gray-600">{video.caption}</p>}
          <p className="text-xs text-gray-400 mt-0.5">{time}</p>
        </div>
      </div>
    </div>
  );
}

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

function VideoUploader({ date }: { date: string }) {
  const qc = useQueryClient();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('video/')) {
      setError('Please choose a video file.');
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError('That video is larger than 500MB.');
      return;
    }
    const ext = file.name.split('.').pop() || 'mp4';
    try {
      setProgress(0);
      const { uploadUrl, path } = await api.entries.videoUploadUrl(date, file.type, ext);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(file);
      });

      await api.entries.addVideo(date, { path, contentType: file.type, size: file.size });
      qc.invalidateQueries({ queryKey: ['entry', date] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;

  return (
    <>
      <label
        className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-[0.97] transition-all cursor-pointer ${
          busy ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        <Upload size={13} strokeWidth={2.5} />
        {busy ? `Uploading ${progress}%` : 'Add video'}
        <input
          type="file"
          accept="video/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) upload(file);
          }}
        />
      </label>
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </>
  );
}

function AnnotatedImage({
  image,
  date,
  className = '',
}: {
  image: JournalImage;
  date: string;
  className?: string;
}) {
  const src =
    image.url ??
    `${import.meta.env.VITE_API_URL ?? ''}/api/media/${image.messageId}/${image.mediaId}`;
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [draft, setDraft] = useState(image.annotation ?? '');
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.entries.updateImageAnnotation(date, image.id, draft.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', date] });
      setEditing(false);
    },
  });

  return (
    <div className={`relative group/img overflow-hidden ${className}`}>
      <img
        src={src}
        alt={image.annotation ?? image.caption ?? 'Journal image'}
        loading="lazy"
        onClick={() => setZoomed(true)}
        className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover/img:scale-[1.02]"
      />
      {image.annotation && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pt-6 pb-2.5">
          <p className="text-white text-xs sm:text-sm font-medium leading-snug drop-shadow">
            {image.annotation}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setDraft(image.annotation ?? '');
          setEditing(true);
        }}
        aria-label="Annotate image"
        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/45 text-white opacity-0 group-hover/img:opacity-100 hover:bg-black/70 transition-opacity"
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
      <Modal open={editing} onClose={() => setEditing(false)} className="max-w-md">
        <ModalHeader title="Annotate image" onClose={() => setEditing(false)} />
        <img src={src} alt="" className="w-full max-h-56 object-contain rounded-lg bg-gray-100 mb-3" />
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Add a note for this photo…"
          className="w-full text-sm text-gray-700 leading-relaxed rounded-lg border border-gray-300 bg-white/70 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
        />
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-3.5 py-1.5 rounded-lg text-gray-500 text-sm font-medium hover:bg-gray-500/10 active:scale-[0.97] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutate()}
            disabled={isPending}
            className="px-3.5 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

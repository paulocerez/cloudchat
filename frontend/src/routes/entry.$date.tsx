import { useState } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '~/lib/api';
import { formatEntryDate } from '~/lib/utils';
import { extractSpotifyLinks, spotifyEmbedUrl, stripSpotifyLinks, type SpotifyLink } from '~/lib/spotify';
import { staticMapUrl } from '~/lib/mapbox';
import { MapPin, Star, WandSparkles, List, LayoutGrid, MessageSquare, Image as ImageIcon, Mic, Music, Film, Upload, Pencil, X, Plus, Check, SlidersHorizontal, CalendarClock } from 'lucide-react';
import type { JournalEntry, TextMessage, VoiceMemo, JournalImage, JournalVideo, Habit } from '@cloudchat/shared';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { tone } from '~/lib/periods';
import { HabitManager } from '~/components/HabitManager';
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
    <div className="animate-fade-up">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-900 text-sm mb-6 transition-all duration-150 hover:-translate-x-0.5"
      >
        ← Timeline
      </Link>
      {entry.title && (
        <p className="text-xs font-medium tracking-wide uppercase text-gray-400 mb-1">
          {entry.title}
        </p>
      )}
      <div className="mb-3">
        <h1 className="text-lg font-semibold text-gray-900">{formatEntryDate(entry.date)}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <EditSummaryButton entry={entry} />
          <VideoUploader date={entry.date} />
          <GenerateSummaryButton date={entry.date} hasSummary={Boolean(entry.summary)} />
          <HighlightToggle date={entry.date} highlight={Boolean(entry.highlight)} />
        </div>
      </div>
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
    </div>
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
        className="shrink-0 inline-flex items-center gap-1 px-3.5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
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
    <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
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
        className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
      >
        <Pencil size={13} strokeWidth={2.5} />
        Edit
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-up"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Edit day summary</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short headline"
              className="w-full text-sm text-gray-700 rounded-lg border border-gray-300 px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <label className="block text-xs font-medium text-gray-500 mb-1">Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={8}
              className="w-full text-sm text-gray-700 leading-relaxed rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-gray-500 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => mutate()}
                disabled={isPending}
                className="px-3.5 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
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
      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
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
      className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
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
    <div className="mb-6 rounded-2xl border border-gray-200 overflow-hidden animate-fade-up">
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
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
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

  const items: Item[] = [
    ...entry.messages.map((m: TextMessage): Item => ({ kind: 'message', data: m })),
    ...entry.voiceMemos.map((v: VoiceMemo): Item => ({ kind: 'voice', data: v })),
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
  const isEmpty =
    songs.length === 0 &&
    entry.images.length === 0 &&
    entry.voiceMemos.length === 0 &&
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

      {entry.voiceMemos.length > 0 && (
        <Section icon={Mic} title="Voice memos" count={entry.voiceMemos.length}>
          <div className="space-y-2">
            {entry.voiceMemos.map((memo) => (
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
      <div className={`max-w-xs md:max-w-md rounded-2xl ${align === 'right' ? 'rounded-br-sm' : 'rounded-bl-sm'} bg-gray-50 border border-gray-200 px-4 py-3 hover:border-gray-300 transition-colors duration-150`}>
        <div className="flex items-center gap-2 mb-2">
          {/* Animated waveform */}
          <div className="flex items-end gap-0.5 h-4">
            <span className="wave-bar h-2" />
            <span className="wave-bar h-4" />
            <span className="wave-bar h-3" />
            <span className="wave-bar h-4" />
          </div>
          <span className="text-xs text-gray-400 font-medium">Voice memo</span>
          <span className="text-xs text-gray-300 ml-auto">{time}</span>
        </div>
        <audio controls preload="none" src={src} className="w-full h-9 mb-2" />
        <div className="flex items-start gap-1.5">
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
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-up"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
            <input
              type="date"
              value={moveTo}
              onChange={(e) => setMoveTo(e.target.value)}
              className="w-full text-sm text-gray-700 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              It keeps its time of day. If that day has no entry yet, one will be created.
            </p>
            {m.isError && (
              <p className="text-xs text-rose-500 mt-2">Couldn't move it. Try again.</p>
            )}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-gray-500 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => m.mutate()}
                disabled={m.isPending || !moveTo || moveTo === date}
                className="px-3.5 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                {m.isPending ? 'Moving…' : 'Move'}
              </button>
            </div>
          </div>
        </div>
      )}
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-up"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Edit transcription</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          autoFocus
          className="w-full text-sm text-gray-700 leading-relaxed rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
        />
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg text-gray-500 text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
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
        className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer ${
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-up cursor-zoom-out"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close"
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
          <figure className="max-w-full max-h-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={src}
              alt={image.annotation ?? image.caption ?? 'Journal image'}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {(image.annotation || image.caption) && (
              <figcaption className="mt-3 text-center text-sm text-white/80 max-w-2xl">
                {image.annotation ?? image.caption}
              </figcaption>
            )}
          </figure>
        </div>
      )}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-up"
          onClick={() => setEditing(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Annotate image</h2>
              <button
                type="button"
                onClick={() => setEditing(false)}
                aria-label="Close"
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <img src={src} alt="" className="w-full max-h-56 object-contain rounded-lg bg-gray-100 mb-3" />
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Add a note for this photo…"
              className="w-full text-sm text-gray-700 leading-relaxed rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-3.5 py-1.5 rounded-lg text-gray-500 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => mutate()}
                disabled={isPending}
                className="px-3.5 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

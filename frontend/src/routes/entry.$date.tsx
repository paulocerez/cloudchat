import { useEffect, useState } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { WandSparkles } from 'lucide-react';
import { api } from '~/lib/api';
import { Composer } from '~/components/entry/Composer';
import { EditEntrySheet } from '~/components/entry/EditEntrySheet';
import { EntryActionsSheet } from '~/components/entry/EntryActionsSheet';
import { EntryHeader } from '~/components/entry/EntryHeader';
import { HabitSheet } from '~/components/entry/HabitSheet';
import { LocationSheet } from '~/components/entry/LocationSheet';
import { OrganizedView } from '~/components/entry/OrganizedView';
import { PocketSection } from '~/components/entry/PocketSection';
import { PropertyTray } from '~/components/entry/PropertyTray';
import { TimelineView } from '~/components/entry/TimelineView';
import { ViewToggle, type ViewMode } from '~/components/entry/ViewToggle';
import { sectionId, type EntrySection } from '~/components/entry/shared';
import { useVideoUpload, VideoUploadStatus } from '~/components/entry/useVideoUpload';
import { rootRoute } from './__root';

export const entryDateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entry/$date',
  component: EntryPage,
});

type OpenSheet = 'edit' | 'actions' | 'places' | 'habits' | null;

function EntryPage() {
  const { date } = entryDateRoute.useParams();
  const [view, setView] = useState<ViewMode>(
    () => (localStorage.getItem('entryViewMode') as ViewMode) || 'timeline'
  );
  const setViewMode = (v: ViewMode) => {
    setView(v);
    localStorage.setItem('entryViewMode', v);
  };

  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [pendingJump, setPendingJump] = useState<EntrySection | null>(null);
  const video = useVideoUpload(date);

  const { data: entry, isLoading, isError } = useQuery({
    queryKey: ['entry', date],
    queryFn: () => api.entries.get(date),
  });

  // A count pill jumps to its block. Everything but Pocket only has a heading
  // in the organized view, so switch there first and scroll on the next render.
  useEffect(() => {
    if (!pendingJump) return;
    document
      .getElementById(sectionId(pendingJump))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setPendingJump(null);
  }, [pendingJump, view]);

  const jump = (section: EntrySection) => {
    if (section !== 'pocket' && view !== 'organized') setViewMode('organized');
    setPendingJump(section);
  };

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
      <EntryHeader
        entry={entry}
        onEdit={() => setSheet('edit')}
        onActions={() => setSheet('actions')}
      />

      {/* Clears the fixed composer, plus the home indicator underneath it. */}
      <div className="animate-fade-up pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        <PropertyTray
          entry={entry}
          onOpenPlaces={() => setSheet('places')}
          onOpenHabits={() => setSheet('habits')}
          onOpenActions={() => setSheet('actions')}
          onJump={jump}
        />

        <div className="mt-4">
          <VideoUploadStatus progress={video.progress} error={video.error} />
          {entry.summary ? (
            <p className="text-[15px] text-gray-600 leading-relaxed">{entry.summary}</p>
          ) : (
            <GenerateSummaryRow date={entry.date} />
          )}
        </div>

        <div className="flex justify-end my-4">
          <ViewToggle view={view} onChange={setViewMode} />
        </div>

        {view === 'timeline' ? <TimelineView entry={entry} /> : <OrganizedView entry={entry} />}

        <PocketSection entry={entry} />
      </div>

      <Composer date={entry.date} onAdd={() => setSheet('actions')} />
      {video.input}

      <EditEntrySheet entry={entry} open={sheet === 'edit'} onClose={() => setSheet(null)} />
      <LocationSheet entry={entry} open={sheet === 'places'} onClose={() => setSheet(null)} />
      <HabitSheet
        date={entry.date}
        habitsDone={entry.habitsDone ?? []}
        open={sheet === 'habits'}
        onClose={() => setSheet(null)}
      />
      <EntryActionsSheet
        entry={entry}
        open={sheet === 'actions'}
        onClose={() => setSheet(null)}
        onEditPlaces={() => setSheet('places')}
        onTrackHabits={() => setSheet('habits')}
        onUploadVideo={video.choose}
      />
    </>
  );
}

// Only shown when the day has no summary yet — otherwise regenerating lives in
// the overflow menu, where it doesn't compete with the day's content.
function GenerateSummaryRow({ date }: { date: string }) {
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
      className="inline-flex items-center gap-1.5 h-9 -ml-1 px-1 rounded-lg text-sm text-gray-400 hover:text-gray-900 active:scale-[0.97] transition-all disabled:opacity-50"
    >
      <WandSparkles size={15} strokeWidth={2} />
      {isPending ? 'Generating summary…' : isError ? 'Retry summary' : 'Generate summary'}
    </button>
  );
}

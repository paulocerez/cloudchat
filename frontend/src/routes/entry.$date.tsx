import { useState } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { WandSparkles } from 'lucide-react';
import { api, HttpError } from '~/lib/api';
import { emptyEntry, isEmptyDay } from '~/lib/days';
import { Composer } from '~/components/entry/Composer';
import { DayStats } from '~/components/entry/DayStats';
import { EditEntrySheet } from '~/components/entry/EditEntrySheet';
import { EntryActionsSheet } from '~/components/entry/EntryActionsSheet';
import { EntryHeader } from '~/components/entry/EntryHeader';
import { HabitSheet } from '~/components/entry/HabitSheet';
import { LocationSheet } from '~/components/entry/LocationSheet';
import { OrganizedView } from '~/components/entry/OrganizedView';
import { PocketSection } from '~/components/entry/PocketSection';
import { SwipeDays } from '~/components/entry/SwipeDays';
import { TimelineView } from '~/components/entry/TimelineView';
import { TodosSheet } from '~/components/entry/TodosSheet';
import { ViewToggle, type ViewMode } from '~/components/entry/ViewToggle';
import { UploadStatus, useMediaUpload } from '~/components/entry/useMediaUpload';
import { rootRoute } from './__root';

export const entryDateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entry/$date',
  component: EntryPage,
});

type OpenSheet = 'edit' | 'actions' | 'places' | 'habits' | 'todos' | null;

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
  const media = useMediaUpload(date);

  const { data: entry, isLoading, isError } = useQuery({
    queryKey: ['entry', date],
    // A day with no document yet isn't an error, it's an empty day. The backend
    // creates the document on the first write, so this is all the UI needs.
    queryFn: () =>
      api.entries.get(date).catch((err) =>
        err instanceof HttpError && err.status === 404
          ? emptyEntry(date)
          : Promise.reject(err)
      ),
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted animate-fade-up">
        <span className="w-4 h-4 rounded-md border-2 border-line-strong border-t-muted animate-spin-slow" />
        <span className="text-sm">Loading…</span>
      </div>
    );

  if (isError || !entry)
    return (
      <div className="text-center py-8 animate-fade-up">
        <p className="text-secondary text-sm">Entry not found</p>
        <Link to="/" className="text-ink underline text-sm mt-2 block">
          ← Back to timeline
        </Link>
      </div>
    );

  return (
    <>
      <EntryHeader entry={entry} onActions={() => setSheet('actions')} />

      <SwipeDays date={entry.date}>
        {/* Clears the fixed composer, plus the home indicator underneath it. */}
        <div className="animate-fade-up pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <DayStats
            entry={entry}
            onOpenPlaces={() => setSheet('places')}
            onOpenHabits={() => setSheet('habits')}
            onOpenTodos={() => setSheet('todos')}
          />

          <div className="mt-4">
            <UploadStatus progress={media.progress} error={media.error} />
            {entry.summary ? (
              <p className="text-[16px] text-secondary leading-[1.55]">{entry.summary}</p>
            ) : isEmptyDay(entry) ? null : (
              <GenerateSummaryRow date={entry.date} />
            )}
          </div>

          <div className="flex justify-end my-4">
            <ViewToggle view={view} onChange={setViewMode} />
          </div>

          {view === 'timeline' ? <TimelineView entry={entry} /> : <OrganizedView entry={entry} />}

          <PocketSection entry={entry} />
        </div>
      </SwipeDays>

      <Composer
        date={entry.date}
        onAdd={() => setSheet('actions')}
        onPickPhoto={media.chooseImage}
      />
      {media.inputs}

      <EditEntrySheet entry={entry} open={sheet === 'edit'} onClose={() => setSheet(null)} />
      <LocationSheet entry={entry} open={sheet === 'places'} onClose={() => setSheet(null)} />
      <TodosSheet entry={entry} open={sheet === 'todos'} onClose={() => setSheet(null)} />
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
        onEdit={() => setSheet('edit')}
        onEditPlaces={() => setSheet('places')}
        onTrackHabits={() => setSheet('habits')}
        onAddPhoto={media.chooseImage}
        onUploadVideo={media.chooseVideo}
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
      className="inline-flex items-center gap-1.5 h-9 -ml-1 px-2 rounded-md text-sm text-muted hover:text-ink hover:bg-hover active:scale-[0.97] transition-all disabled:opacity-50"
    >
      <WandSparkles size={15} strokeWidth={2} />
      {isPending ? 'Generating summary…' : isError ? 'Retry summary' : 'Generate summary'}
    </button>
  );
}

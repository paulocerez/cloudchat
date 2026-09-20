import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, Circle, CircleCheck } from 'lucide-react';
import type { JournalEntry, VoiceMemo } from '@cloudchat/shared';
import { api } from '~/lib/api';
import { PocketSummary } from '~/components/PocketSummary';
import { MoveToDayButton } from './MoveToDaySheet';
import { VoicePlayer } from './VoicePlayer';
import { formatDuration, mediaUrl, pocketMemos, sectionId } from './shared';

export function PocketSection({ entry }: { entry: JournalEntry }) {
  const recordings = pocketMemos(entry);
  if (recordings.length === 0) return null;

  const tasks = recordings.reduce((n, m) => n + (m.actionItems?.length ?? 0), 0);

  return (
    <section
      id={sectionId('pocket')}
      className="mt-10 pt-6 border-t border-line scroll-mt-32 animate-fade-up"
    >
      {/* Matches the Section headers used elsewhere on the page. */}
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-xs font-medium text-muted">Pocket</h2>
        <span className="text-xs text-faintest">
          {recordings.length} recording{recordings.length === 1 ? '' : 's'}
          {tasks > 0 && ` · ${tasks} action item${tasks === 1 ? '' : 's'}`}
        </span>
      </div>
      {/* One hairline-separated list rather than 7 boxes — at a recording an
          hour, stacked cards turn the foot of the page into a wall. */}
      <div className="rounded-xl surface-solid divide-y divide-line overflow-hidden">
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
  const src = mediaUrl(`/api/media/pocket/${memo.pocketRecordingId ?? memo.mediaId}`);

  return (
    <article className="group">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-surface-hover transition-colors duration-150"
      >
        <span className="shrink-0 w-11 pt-0.5 text-xs tabular-nums text-faint">{time}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold text-ink leading-snug">
            {memo.title || 'Recording'}
          </span>
          <span className="block text-xs text-faint mt-0.5">
            {duration}
            {items.length > 0 && ` · ${items.length} action item${items.length === 1 ? '' : 's'}`}
          </span>
        </span>
        <ChevronDown
          size={15}
          strokeWidth={2}
          className={`shrink-0 mt-0.5 text-faintest group-hover:text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Action items are the payload of a recording — always visible, indented
          to line up with the title above. */}
      {items.length > 0 && (
        <ul className="px-4 pb-3 pl-[4.25rem] space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              {item.isCompleted ? (
                <CircleCheck size={14} strokeWidth={2.25} className="mt-[3px] shrink-0 text-ink" aria-hidden />
              ) : (
                <Circle size={14} strokeWidth={2.25} className="mt-[3px] shrink-0 text-faint" aria-hidden />
              )}
              <span className="min-w-0">
                <span className={item.isCompleted ? 'text-faint line-through' : 'text-strong'}>
                  {item.title}
                </span>
                {item.priority === 'high' && !item.isCompleted && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-300 ml-1.5 align-[1px]">high</span>
                )}
                {item.dueDate && (
                  <span className="text-[11px] text-faint ml-1.5 align-[1px]">
                    due {item.dueDate}
                  </span>
                )}
                {open && item.context && (
                  <span className="block text-xs text-faint leading-relaxed mt-0.5">
                    {item.context}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="px-4 pb-4 pl-4 sm:pl-[4.25rem] space-y-3 animate-fade-up">
          {/* No trailing clock label — the row header above already shows it,
              and next to the elapsed counter it reads as a duration. */}
          <VoicePlayer src={src} time="" />

          {memo.summaryMarkdown && <PocketSummary markdown={memo.summaryMarkdown} />}

          {memo.bulletPoints && memo.bulletPoints.length > 0 && (
            <ul className="space-y-1.5">
              {memo.bulletPoints.map((point, i) => (
                <li key={i} className="flex gap-2 text-sm text-strong leading-relaxed">
                  <span className="text-faintest select-none">•</span>
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
                  className="text-xs px-2 py-0.5 rounded-md bg-sunken text-muted"
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
                className="text-xs text-faint hover:text-strong transition-colors py-2"
              >
                {showTranscript ? 'Hide transcript' : 'Show transcript'}
              </button>
            )}
            {memo.language && <span className="text-xs text-faintest">{memo.language}</span>}
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
            <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto pr-1">
              {memo.transcription}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, Dumbbell } from 'lucide-react';
import type { Workout, WorkoutSet } from '@cloudchat/shared';
import { formatDuration } from './shared';

// "80 kg × 8", "5 km", "1:30" — whatever the set actually recorded.
function setLabel(s: WorkoutSet): string {
  if (s.weightKg && s.reps) return `${s.weightKg} kg × ${s.reps}`;
  if (s.reps) return `${s.reps} reps`;
  if (s.distanceM) return s.distanceM >= 1000 ? `${+(s.distanceM / 1000).toFixed(2)} km` : `${s.distanceM} m`;
  if (s.durationS) return formatDuration(s.durationS) ?? `${s.durationS}s`;
  return '—';
}

// Collapsed, a workout reads as one line per exercise; opening it lists every
// set. Warmups are dimmed so the working sets carry the row.
export function WorkoutCard({ workout, id }: { workout: Workout; id?: string }) {
  const [open, setOpen] = useState(false);
  const time = format(new Date(workout.startTime), 'HH:mm');
  const seconds = (Date.parse(workout.endTime) - Date.parse(workout.startTime)) / 1000;
  const duration = formatDuration(seconds);
  const setCount = workout.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.type !== 'warmup').length,
    0
  );

  return (
    <article id={id} className="group rounded-xl surface-solid overflow-hidden scroll-mt-32">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-surface-hover transition-colors duration-150"
      >
        <span className="shrink-0 w-11 pt-0.5 text-xs tabular-nums text-faint">{time}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold text-ink leading-snug">
            {workout.title}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-faint mt-0.5">
            <Dumbbell size={12} strokeWidth={2} className="shrink-0" aria-hidden />
            <span>
              Hevy
              {duration && ` · ${duration}`}
              {` · ${workout.exercises.length} exercise${workout.exercises.length === 1 ? '' : 's'}`}
              {` · ${setCount} set${setCount === 1 ? '' : 's'}`}
            </span>
          </span>
        </span>
        <ChevronDown
          size={15}
          strokeWidth={2}
          className={`shrink-0 mt-0.5 text-faintest group-hover:text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <ul className="px-4 pb-3 pl-[4.25rem] space-y-1.5">
        {workout.exercises.map((e, i) => {
          const working = e.sets.filter((s) => s.type !== 'warmup');
          return (
            <li key={i} className="text-sm">
              <span className="text-strong">{e.title}</span>
              {!open && working.length > 0 && (
                <span className="text-faint ml-1.5">
                  {working.length} × {setLabel(working[working.length - 1])}
                </span>
              )}
              {open && (
                <span className="block mt-0.5 space-y-0.5 animate-fade-up">
                  {e.sets.map((s, j) => (
                    <span
                      key={j}
                      className={`block text-xs tabular-nums ${s.type === 'warmup' ? 'text-faintest' : 'text-muted'}`}
                    >
                      {setLabel(s)}
                      {s.type !== 'normal' && <span className="ml-1.5">{s.type}</span>}
                      {s.rpe != null && <span className="ml-1.5">@ RPE {s.rpe}</span>}
                    </span>
                  ))}
                  {e.notes && (
                    <span className="block text-xs text-faint leading-relaxed mt-1">{e.notes}</span>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {open && workout.description && (
        <p className="px-4 pb-4 pl-4 sm:pl-[4.25rem] text-sm text-muted leading-relaxed whitespace-pre-wrap">
          {workout.description}
        </p>
      )}
    </article>
  );
}

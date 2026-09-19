import { useRouter } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from 'motion/react';
import { canGoForward, shiftDate } from './EntryHeader';

const THRESHOLD = 70;

/**
 * Swipe left or right to walk day by day. Getting to yesterday used to mean
 * back → scroll → tap, which is three interactions for the most common move
 * in a journal.
 *
 * `dragDirectionLock` is what makes this safe to put around a scrolling page:
 * motion commits to one axis per gesture, so a vertical scroll never turns
 * into a navigation halfway through.
 */
export function SwipeDays({ date, children }: { date: string; children: React.ReactNode }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const x = useMotionValue(0);

  const forward = canGoForward(date);

  // The date you'd land on fades in from the edge you're pulling away from.
  const prevOpacity = useTransform(x, [0, THRESHOLD], [0, 1]);
  const nextOpacity = useTransform(x, [-THRESHOLD, 0], [1, 0]);

  const go = (days: number) =>
    router.navigate({ to: '/entry/$date', params: { date: shiftDate(date, days) } });

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const dx = info.offset.x;
    if (dx <= -THRESHOLD && forward) return go(1);
    if (dx >= THRESHOLD) return go(-1);
    animate(x, 0, { type: 'spring', bounce: 0.25, duration: 0.4 });
  };

  if (reduce) return <>{children}</>;

  return (
    <div className="relative">
      <Peek side="left" opacity={prevOpacity} label={format(new Date(shiftDate(date, -1) + 'T00:00:00'), 'EEE d MMM')} />
      {forward && (
        <Peek
          side="right"
          opacity={nextOpacity}
          label={format(new Date(shiftDate(date, 1) + 'T00:00:00'), 'EEE d MMM')}
        />
      )}
      <motion.div
        drag="x"
        dragDirectionLock
        dragElastic={0.22}
        dragMomentum={false}
        dragConstraints={{ left: forward ? -120 : 0, right: 120 }}
        onDragEnd={onDragEnd}
        style={{ x }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function Peek({
  side,
  opacity,
  label,
}: {
  side: 'left' | 'right';
  opacity: ReturnType<typeof useTransform<number, number>>;
  label: string;
}) {
  return (
    <motion.span
      aria-hidden
      style={{ opacity }}
      className={`pointer-events-none absolute top-24 ${
        side === 'left' ? 'left-0' : 'right-0'
      } z-0 text-[11px] font-semibold uppercase tracking-wide text-faint`}
    >
      {label}
    </motion.span>
  );
}

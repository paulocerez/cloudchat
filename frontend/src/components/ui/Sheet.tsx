import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  motion,
  useMotionValue,
  animate,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from 'motion/react';
import { cn } from '~/lib/utils';

// Apple's momentum projection: where a flick would come to rest.
// Same helper the image lightbox uses.
function project(initialVelocity: number, decelerationRate = 0.999) {
  return (initialVelocity / 1000) * (decelerationRate / (1 - decelerationRate));
}

const DISMISS_THRESHOLD = 110;

// `sm` in Tailwind. Below it we're on a phone and overlays belong on the
// bottom edge; above it the centered dialog still reads better.
// Sheet itself no longer branches on this — the bottom-vs-centered layout is a
// pure CSS decision now, so it can never render the wrong shape while a piece
// of React state catches up. MenuSheet still needs it to choose between a
// sheet and an anchored dropdown, which really are different components.
export function useIsCompact(): boolean {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches);
    setCompact(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return compact;
}

// Sheets can stack (a habit sheet opening the habit manager), so the lock is
// refcounted rather than a plain set/restore.
let lockCount = 0;
function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (lockCount++ === 0) document.body.style.overflow = 'hidden';
    return () => {
      if (--lockCount === 0) document.body.style.overflow = '';
    };
  }, [active]);
}

// How much of the layout viewport the software keyboard is covering. A sheet
// pinned to `bottom-0` sits at the bottom of the *layout* viewport, which on a
// phone is behind the keyboard; padding the container by this lifts it clear.
function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!active || !vv) return;
    const measure = () => setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    measure();
    vv.addEventListener('resize', measure);
    vv.addEventListener('scroll', measure);
    return () => {
      vv.removeEventListener('resize', measure);
      vv.removeEventListener('scroll', measure);
    };
  }, [active]);
  return active ? inset : 0;
}

export function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, onEscape]);
}

// Focusing on mount would open the keyboard while the sheet is still sliding
// up, which fights the entrance and lands the field somewhere unexpected.
// Wait for the animation to settle first. 450ms ≈ `sheet-up`'s 0.42s.
export function useDelayedFocus<T extends HTMLElement>(delay = 450) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return ref;
}

export type SheetVariant = 'auto' | 'bottom' | 'center';

/**
 * Overlay primitive. On a phone it's a bottom sheet you can fling away by the
 * grabber; on a wider screen it's the glass dialog the app already used.
 * Drag is bound to the grab handle only, so scrolling the sheet's own content
 * never fights the dismiss gesture.
 */
export function Sheet({
  open,
  onClose,
  children,
  className = 'max-w-lg',
  variant = 'auto',
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: SheetVariant;
}) {
  const reduce = useReducedMotion();
  const dragControls = useDragControls();
  const y = useMotionValue(0);

  useScrollLock(open);
  useEscape(open, onClose);
  const keyboardInset = useKeyboardInset(open);

  useEffect(() => {
    if (open) y.set(0);
  }, [open, y]);

  if (!open) return null;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const projected = info.offset.y + project(info.velocity.y);
    if (projected > DISMISS_THRESHOLD) onClose();
    else animate(y, 0, { type: 'spring', bounce: 0.2, duration: 0.4 });
  };

  // Positioned against the portal wrapper, not the viewport, and with no
  // z-index of its own — it and the panel are siblings, so the panel must be
  // the one that paints last. Giving the scrim a z-index buried the panel
  // under its own blur.
  const scrim = (
    <div
      className="glass-scrim absolute inset-0 bg-black/25 backdrop-blur-md animate-scrim"
      onClick={onClose}
    />
  );

  // One DOM tree for both shapes; the breakpoint does the deciding. `variant`
  // only ever pins it to one side of that breakpoint.
  const centered = variant === 'center';
  const bottom = variant === 'bottom';

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[90] flex justify-center',
        centered && 'items-center p-4',
        bottom && 'items-end',
        variant === 'auto' && 'items-end sm:items-center sm:p-4'
      )}
      style={keyboardInset ? { paddingBottom: keyboardInset } : undefined}
    >
      {scrim}
      {/* The wrapper owns the entrance animation so the inner motion transform
          stays free for the drag; the panel owns the height cap, so the
          grabber counts against it instead of stacking on top of it. */}
      <div
        className={cn(
          'relative z-10 w-full',
          centered ? 'sheet-enter-center' : '',
          bottom ? 'sheet-enter-bottom' : '',
          variant === 'auto' && 'sheet-enter',
          className
        )}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          drag={reduce || centered ? false : 'y'}
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.9 }}
          dragMomentum={false}
          onDragEnd={onDragEnd}
          style={{ y }}
          className={cn(
            'flex flex-col bg-surface-2 shadow-2xl ring-1 ring-line',
            centered ? 'max-h-[85dvh] rounded-2xl' : '',
            bottom ? 'max-h-[88dvh] rounded-t-2xl' : '',
            variant === 'auto' && 'max-h-[88dvh] sm:max-h-[85dvh] rounded-t-2xl sm:rounded-2xl'
          )}
        >
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className={cn(
              'flex shrink-0 justify-center py-3 cursor-grab active:cursor-grabbing touch-none',
              centered && 'hidden',
              variant === 'auto' && 'sm:hidden'
            )}
          >
            <span className="h-1 w-10 rounded-full bg-line-strong" />
          </div>
          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]',
              centered ? 'pt-5 pb-5' : '',
              variant === 'auto' && 'sm:pt-5 sm:pb-5'
            )}
          >
            {children}
          </div>
        </motion.div>
      </div>
    </div>,
    document.body
  );
}

// Title + close button, shared by every sheet.
export function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[15px] font-semibold text-ink tracking-[-0.01em]">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="h-9 w-9 -mr-2 flex items-center justify-center rounded-md text-faint hover:text-strong hover:bg-hover active:scale-90 transition-all"
      >
        <X size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}

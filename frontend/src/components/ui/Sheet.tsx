import { useEffect, useState } from 'react';
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
  const compact = useIsCompact();
  const reduce = useReducedMotion();
  const dragControls = useDragControls();
  const y = useMotionValue(0);

  useScrollLock(open);
  useEscape(open, onClose);

  useEffect(() => {
    if (open) y.set(0);
  }, [open, y]);

  if (!open) return null;

  const asBottom = variant === 'bottom' || (variant === 'auto' && compact);

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

  if (!asBottom) {
    return createPortal(
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        {scrim}
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-sm bg-white shadow-2xl ring-1 ring-gray-900/[0.08] p-5 animate-materialize',
            className
          )}
        >
          {children}
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      {scrim}
      {/* The wrapper does the entrance slide so the inner motion transform
          stays free for the drag. */}
      <div className="absolute inset-x-0 bottom-0 z-10 animate-sheet-up">
        <motion.div
          role="dialog"
          aria-modal="true"
          drag={reduce ? false : 'y'}
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.9 }}
          dragMomentum={false}
          onDragEnd={onDragEnd}
          style={{ y }}
          className="mx-auto w-full max-w-lg rounded-t-sm bg-white shadow-2xl ring-1 ring-gray-900/[0.08]"
        >
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
          >
            <span className="h-1 w-10 rounded-sm bg-[#D6D6DE]" />
          </div>
          <div className="max-h-[80vh] overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
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
      <h2 className="text-[15px] font-semibold text-[#17171C] tracking-[-0.01em]">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="h-9 w-9 -mr-2 flex items-center justify-center rounded-sm text-gray-400 hover:text-gray-700 hover:bg-gray-500/10 active:scale-90 transition-all"
      >
        <X size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}

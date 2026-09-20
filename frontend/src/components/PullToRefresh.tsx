import { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const TRIGGER = 72;
const MAX = 110;

/**
 * Drag down at the top of the list to refetch. The app's data arrives from
 * WhatsApp and a Pocket recorder while you're not looking, so "is there
 * anything new" is a question you ask constantly — and there was no way to
 * answer it short of reloading the page.
 *
 * Only engages when the window is already scrolled to the top, and only for
 * touch, so it can't hijack a mouse wheel or a mid-list scroll.
 */
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<unknown>;
  children: React.ReactNode;
}) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);

  const end = async () => {
    const shouldRun = pull >= TRIGGER;
    start.current = null;
    if (!shouldRun || busy) {
      setPull(0);
      return;
    }
    setBusy(true);
    setPull(TRIGGER);
    navigator.vibrate?.(8);
    try {
      await onRefresh();
    } finally {
      setBusy(false);
      setPull(0);
    }
  };

  const ready = pull >= TRIGGER;

  return (
    <div
      onTouchStart={(e) => {
        if (window.scrollY > 0 || busy) return;
        start.current = e.touches[0].clientY;
      }}
      onTouchMove={(e) => {
        if (start.current === null) return;
        const dy = e.touches[0].clientY - start.current;
        if (dy <= 0) {
          setPull(0);
          return;
        }
        // Resistance, so it feels like stretching rather than sliding.
        setPull(Math.min(MAX, dy * 0.45));
      }}
      onTouchEnd={end}
      onTouchCancel={end}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: pull, transitionProperty: start.current === null ? 'height' : 'none' }}
      >
        <RefreshCw
          size={17}
          strokeWidth={2.25}
          className={`text-muted ${busy ? 'ptr-spin' : ''}`}
          style={{
            opacity: Math.min(1, pull / TRIGGER),
            transform: busy ? undefined : `rotate(${(pull / TRIGGER) * 180}deg)`,
          }}
        />
        <span className="sr-only">{ready ? 'Release to refresh' : 'Pull to refresh'}</span>
      </div>
      {children}
    </div>
  );
}

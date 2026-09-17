import { useRef } from 'react';

const MOVE_TOLERANCE = 8; // px — past this it's a scroll, not a press

/**
 * Touch-only long press. Desktop keeps its hover-revealed controls, so mouse
 * pointers are ignored entirely; this exists so the same actions are reachable
 * with a thumb, where hover does not exist.
 */
export function useLongPress(onLongPress: () => void, ms = 450) {
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      fired.current = false;
      origin.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        timer.current = null;
        fired.current = true;
        navigator.vibrate?.(8);
        onLongPress();
      }, ms);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const start = origin.current;
      if (!start) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_TOLERANCE) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    // The press still ends in a click. Swallow it on the way down, or lifting
    // your finger off a photo would open the lightbox behind the menu.
    onClickCapture: (e: React.MouseEvent) => {
      if (!fired.current) return;
      fired.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    // Suppress the iOS selection callout once our own menu has opened.
    onContextMenu: (e: React.MouseEvent) => {
      if (fired.current) e.preventDefault();
    },
  };
}

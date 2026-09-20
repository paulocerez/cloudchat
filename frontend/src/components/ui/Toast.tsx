import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, CircleAlert } from 'lucide-react';

type Tone = 'done' | 'error';
type Toast = { id: number; message: string; tone: Tone };

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

/** `toast('Entry deleted')` from anywhere under the provider. */
export function useToast() {
  return useContext(ToastContext);
}

const DURATION = 2600;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const push = useCallback((message: string, tone: Tone = 'done') => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), DURATION);
  }, []);

  // `push` is stable, so this never re-renders the tree it wraps.
  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          // Above the tab capsule, clear of the home indicator. The stack grows
          // upward so the newest toast always lands in the same place.
          <div
            aria-live="polite"
            className="fixed inset-x-0 z-[80] pointer-events-none flex flex-col-reverse items-center gap-2 bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                className="animate-pop flex items-center gap-2 h-11 px-4 rounded-full bg-toast text-toast-ink text-sm font-medium shadow-[var(--surface-shadow)]"
              >
                {t.tone === 'error' ? (
                  <CircleAlert size={16} strokeWidth={2.25} className="text-danger" />
                ) : (
                  <CircleCheck size={16} strokeWidth={2.25} className="text-spotify" />
                )}
                {t.message}
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

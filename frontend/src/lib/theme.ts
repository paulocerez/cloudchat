import { useSyncExternalStore } from 'react';

/**
 * The theme isn't data the tree consumes — it's one class on <html> that CSS
 * reads. So this is a module-scope store rather than a context: a provider
 * would re-render every route to produce identical output, and it would have
 * to live above the RouterProvider anyway. Components that need to *know* the
 * theme (the toggle, the map) subscribe; everything else just gets restyled.
 */

export type Theme = 'system' | 'light' | 'dark';
export type Resolved = 'light' | 'dark';

/* These three are duplicated in index.html's pre-paint script, which has to run
   before any module loads. Change them together. The colours must match --page. */
const THEME_KEY = 'journal_theme';
const DARK_PAGE = '#0d0d11';
const LIGHT_PAGE = '#ffffff';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function read(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* Safari in private mode throws on storage access. */
  }
  return 'system';
}

let current: Theme = read();
const listeners = new Set<() => void>();

export function getTheme(): Theme {
  return current;
}

export function resolveTheme(t: Theme = current): Resolved {
  if (t !== 'system') return t;
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/* useSyncExternalStore bails out when the snapshot is unchanged, so it has to
   carry the resolved value too — in 'system' mode an OS flip moves `resolved`
   while `theme` stays put, and subscribers to `resolved` still need the render. */
let snapshot = `${current}:${resolveTheme(current)}`;

function getSnapshot(): string {
  return snapshot;
}

function apply(r: Resolved): void {
  const el = document.documentElement;
  el.classList.toggle('dark', r === 'dark');
  el.style.colorScheme = r;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', r === 'dark' ? DARK_PAGE : LIGHT_PAGE);
  snapshot = `${current}:${r}`;
}

function emit(): void {
  for (const l of listeners) l();
}

export function setTheme(t: Theme): void {
  current = t;
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* Preference just won't survive the reload. */
  }
  apply(resolveTheme(t));
  emit();
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

let initialised = false;

/**
 * Called once from main.tsx. The pre-paint script in index.html has already
 * set the class — this re-applies it (a no-op) and, the actual point, installs
 * the listeners. They live at module scope because the OS preference drives
 * the <html> class whether or not a toggle happens to be mounted.
 */
export function initTheme(): void {
  if (initialised) return;
  initialised = true;

  apply(resolveTheme(current));

  window.matchMedia(DARK_QUERY).addEventListener('change', () => {
    if (current === 'system') {
      apply(resolveTheme('system'));
      emit();
    }
  });

  // A second tab toggling the theme should bring this one along.
  window.addEventListener('storage', (e) => {
    if (e.key !== null && e.key !== THEME_KEY) return;
    const next = read();
    if (next === current) return;
    current = next;
    apply(resolveTheme(next));
    emit();
  });
}

export function useTheme(): { theme: Theme; resolved: Resolved; setTheme: (t: Theme) => void } {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [theme, resolved] = snap.split(':') as [Theme, Resolved];
  return { theme, resolved, setTheme };
}

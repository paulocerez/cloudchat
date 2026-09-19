import { useRef } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '~/lib/utils';
import { useTheme, type Theme } from '~/lib/theme';

const OPTS: { value: Theme; Icon: typeof Sun; label: string }[] = [
  { value: 'system', Icon: Monitor, label: 'Match system theme' },
  { value: 'light', Icon: Sun, label: 'Light theme' },
  { value: 'dark', Icon: Moon, label: 'Dark theme' },
];

/**
 * Segmented, in the shape of the entry view toggle — but a radiogroup rather
 * than three aria-pressed buttons, because the three options are mutually
 * exclusive and a roving tabindex keeps the whole thing one tab stop.
 *
 * The selected segment is `raised`, not `surface`: it sits on a sunken track
 * and has to read as lifted off it in both themes. `surface` would be *darker*
 * than the track in dark mode and silently invert the affordance.
 */
export function ThemeToggle({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + OPTS.length) % OPTS.length;
    setTheme(OPTS[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn('inline-flex items-center gap-0.5 p-0.5 rounded-2xl bg-sunken', className)}
    >
      {OPTS.map(({ value, Icon, label }, i) => {
        const on = theme === value;
        return (
          <button
            key={value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={label}
            tabIndex={on ? 0 : -1}
            onClick={() => setTheme(value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'flex items-center justify-center rounded-[14px] transition-all active:scale-95',
              size === 'sm' ? 'h-7 w-8' : 'h-9 w-10',
              on
                ? 'bg-raised text-ink shadow-[0_0_0_1px_var(--line),0_1px_2px_rgb(0_0_0/0.06)]'
                : 'text-faint hover:text-ink'
            )}
          >
            <Icon size={size === 'sm' ? 15 : 16} strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}

import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'timeline' | 'organized';

export function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const opts: { mode: ViewMode; Icon: typeof List; label: string }[] = [
    { mode: 'timeline', Icon: List, label: 'Timeline view' },
    { mode: 'organized', Icon: LayoutGrid, label: 'Organized view' },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-sunken">
      {opts.map(({ mode, Icon, label }) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          aria-label={label}
          aria-pressed={view === mode}
          className={`h-9 w-10 flex items-center justify-center rounded-md transition-all active:scale-95 ${
            // `raised`, not `surface-solid` — the selected segment sits on a
            // sunken track and has to read as lifted off it in both themes.
            view === mode
              ? 'bg-raised text-ink shadow-[0_0_0_1px_var(--line),0_1px_2px_rgb(0_0_0/0.06)]'
              : 'text-faint hover:text-ink'
          }`}
        >
          <Icon size={16} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

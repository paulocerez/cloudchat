import { Check } from 'lucide-react';
import type { PeriodColor } from '@cloudchat/shared';
import { PERIOD_COLORS, tone } from '~/lib/periods';
import { PERIOD_ICONS } from '~/lib/icons';

// Uniform swatch grid; selection is shown with a checkmark inside the swatch
// rather than an offset ring, so nothing clips against its neighbours.
export function ColorPicker({
  value,
  onChange,
}: {
  value: PeriodColor;
  onChange: (c: PeriodColor) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(2rem,1fr))] gap-2">
      {PERIOD_COLORS.map((c) => {
        const selected = value === c;
        return (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={selected}
            onClick={() => onChange(c)}
            className={`aspect-square rounded-md ${tone(c).swatch} flex items-center justify-center transition-transform active:scale-90 ${
              selected ? 'scale-105' : 'opacity-80 hover:opacity-100 hover:scale-105'
            }`}
          >
            {selected && <Check size={15} strokeWidth={3.5} className="text-white drop-shadow-sm" />}
          </button>
        );
      })}
    </div>
  );
}

// Same grid as ColorPicker. The selected cell borrows the record's own colour
// so the picker previews exactly what the timeline and calendar will show.
export function IconPicker({
  value,
  onChange,
  color,
}: {
  value: string;
  onChange: (name: string) => void;
  color: PeriodColor;
}) {
  const t = tone(color);
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(2rem,1fr))] gap-2">
      {PERIOD_ICONS.map(({ name, Icon }) => {
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            aria-label={name}
            aria-pressed={selected}
            onClick={() => onChange(name)}
            className={`aspect-square rounded-md flex items-center justify-center transition-transform active:scale-90 ${
              selected
                ? `${t.soft} ${t.text} scale-105`
                : 'bg-sunken text-faint hover:text-secondary hover:scale-105'
            }`}
          >
            <Icon size={16} strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}

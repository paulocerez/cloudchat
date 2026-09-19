import { Check } from 'lucide-react';
import type { PeriodColor } from '@cloudchat/shared';
import { PERIOD_COLORS, tone } from '~/lib/periods';

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
            className={`aspect-square rounded-sm ${tone(c).swatch} flex items-center justify-center transition-transform active:scale-90 ${
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

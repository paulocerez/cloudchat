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
            className={`aspect-square rounded-full ${tone(c).swatch} flex items-center justify-center transition-transform active:scale-90 ${
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

// Uniform emoji grid that fills the row evenly at any count.
export function EmojiPicker({
  value,
  onChange,
  emojis,
}: {
  value: string;
  onChange: (e: string) => void;
  emojis: string[];
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1.5">
      {emojis.map((e) => {
        const selected = value === e;
        return (
          <button
            key={e}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(e)}
            className={`aspect-square rounded-xl text-lg leading-none flex items-center justify-center transition-all active:scale-90 ${
              selected ? 'bg-gray-900 shadow-sm scale-105' : 'bg-gray-100/70 hover:bg-gray-200'
            }`}
          >
            {e}
          </button>
        );
      })}
    </div>
  );
}

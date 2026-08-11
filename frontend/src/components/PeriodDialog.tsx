import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Trash2 } from 'lucide-react';
import type { PeriodColor, TimePeriod } from '@cloudchat/shared';
import { api } from '~/lib/api';
import { PERIOD_COLORS, PERIOD_EMOJIS, tone } from '~/lib/periods';

interface PeriodDialogProps {
  open: boolean;
  onClose: () => void;
  // Present when editing an existing period.
  period?: TimePeriod;
  // Prefill the range (e.g. from a calendar selection) when creating.
  defaultRange?: { startDate: string; endDate: string };
}

export function PeriodDialog({ open, onClose, period, defaultRange }: PeriodDialogProps) {
  const qc = useQueryClient();
  const editing = Boolean(period);

  const [name, setName] = useState(period?.name ?? '');
  const [startDate, setStartDate] = useState(period?.startDate ?? defaultRange?.startDate ?? '');
  const [endDate, setEndDate] = useState(period?.endDate ?? defaultRange?.endDate ?? '');
  const [color, setColor] = useState<PeriodColor>(period?.color ?? 'amber');
  const [emoji, setEmoji] = useState<string>(period?.emoji ?? '🌴');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['periods'] });

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), startDate, endDate, color, emoji };
      return period ? api.periods.update(period.id, body) : api.periods.create(body);
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: () => api.periods.remove(period!.id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  if (!open) return null;

  const rangeInvalid = Boolean(startDate && endDate && startDate > endDate);
  const canSave = name.trim() && startDate && endDate && !rangeInvalid;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-up"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">
            {editing ? 'Edit period' : 'New period'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Name</label>
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none select-none">{emoji}</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Summer in Italy"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Start</label>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">End</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
              />
            </div>
          </div>
          {rangeInvalid && (
            <p className="text-xs text-rose-500 -mt-2">End date must be after the start date.</p>
          )}

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Color</label>
            <div className="flex items-center gap-2">
              {PERIOD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full ${tone(c).swatch} transition-transform ${
                    color === c
                      ? `ring-2 ring-offset-2 ${tone(c).ring} scale-110`
                      : 'hover:scale-110'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Emoji */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Emoji</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {PERIOD_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-8 h-8 rounded-lg text-lg leading-none flex items-center justify-center transition-colors ${
                    emoji === e ? 'bg-gray-900/5 ring-2 ring-gray-900/10' : 'hover:bg-gray-100'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 mt-6">
          {editing ? (
            <button
              type="button"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
            >
              <Trash2 size={15} strokeWidth={2} />
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={!canSave || save.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              {save.isPending ? 'Saving…' : editing ? 'Save' : 'Add period'}
            </button>
          </div>
        </div>

        {(save.isError || remove.isError) && (
          <p className="text-xs text-rose-500 mt-3">Something went wrong. Please try again.</p>
        )}
      </div>
    </div>
  );
}

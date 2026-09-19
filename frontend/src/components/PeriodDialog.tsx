import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import type { PeriodColor, TimePeriod } from '@cloudchat/shared';
import { api } from '~/lib/api';
import { tone } from '~/lib/periods';
import { Modal, ModalHeader } from '~/components/Modal';
import { ColorPicker } from '~/components/Pickers';

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

  const invalidate = () => qc.invalidateQueries({ queryKey: ['periods'] });

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), startDate, endDate, color };
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

  const rangeInvalid = Boolean(startDate && endDate && startDate > endDate);
  const canSave = name.trim() && startDate && endDate && !rangeInvalid;

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader title={editing ? 'Edit period' : 'New period'} onClose={onClose} />

      <div className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Name</label>
          <div className="flex items-center gap-2">
            {/* The period's colour is its identity now that emoji are gone. */}
            <span className={`h-9 w-9 shrink-0 rounded-xl ${tone(color).soft}`}>
              <span className={`block m-[0.6875rem] h-[0.875rem] w-[0.875rem] rounded-full ${tone(color).swatch}`} />
            </span>
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
          <ColorPicker value={color} onChange={setColor} />
        </div>

      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 mt-6">
        {editing ? (
          <button
            type="button"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 active:scale-[0.97] transition-all disabled:opacity-50"
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
            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-500/10 active:scale-[0.97] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={!canSave || save.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-40"
          >
            {save.isPending ? 'Saving…' : editing ? 'Save' : 'Add period'}
          </button>
        </div>
      </div>

      {(save.isError || remove.isError) && (
        <p className="text-xs text-rose-500 mt-3">Something went wrong. Please try again.</p>
      )}
    </Modal>
  );
}

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import type { PeriodColor, TimePeriod } from '@cloudchat/shared';
import { api } from '~/lib/api';
import { tone } from '~/lib/periods';
import { DEFAULT_ICON, iconFor } from '~/lib/icons';
import { Modal, ModalHeader } from '~/components/Modal';
import { useDelayedFocus } from '~/components/ui/Sheet';
import { ColorPicker, IconPicker } from '~/components/Pickers';

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
  const [icon, setIcon] = useState(period?.icon ?? DEFAULT_ICON);

  const Icon = iconFor(icon);

  // Focus once the sheet has finished rising, not while it's still moving.
  const nameRef = useDelayedFocus<HTMLInputElement>();

  const invalidate = () => qc.invalidateQueries({ queryKey: ['periods'] });

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), startDate, endDate, color, icon };
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
          <label className="block text-xs font-medium text-muted mb-1.5">Name</label>
          <div className="flex items-center gap-2">
            {/* Live preview of the icon + colour this period will carry. */}
            <span
              className={`h-9 w-9 shrink-0 rounded-md flex items-center justify-center ${tone(color).soft} ${tone(color).text}`}
            >
              <Icon size={17} strokeWidth={2} />
            </span>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Summer in Italy"
              className="flex-1 px-3 py-2 rounded-md border border-line text-sm text-ink placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-focus/20 focus:border-line-strong"
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Start</label>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-line text-sm text-ink focus:outline-none focus:ring-2 focus:ring-focus/20 focus:border-line-strong"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">End</label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-line text-sm text-ink focus:outline-none focus:ring-2 focus:ring-focus/20 focus:border-line-strong"
            />
          </div>
        </div>
        {rangeInvalid && (
          <p className="text-xs text-danger -mt-2">End date must be after the start date.</p>
        )}

        {/* Icon */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Icon</label>
          <IconPicker value={icon} onChange={setIcon} color={color} />
        </div>

        {/* Color */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Color</label>
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-danger hover:bg-danger-wash active:scale-[0.97] transition-all disabled:opacity-50"
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
            className="px-3 py-2 rounded-md text-sm font-medium text-muted hover:bg-hover active:scale-[0.97] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={!canSave || save.isPending}
            className="px-4 py-2 rounded-md text-sm font-medium bg-ink text-on-ink hover:bg-ink-hover active:scale-[0.97] transition-all disabled:opacity-40"
          >
            {save.isPending ? 'Saving…' : editing ? 'Save' : 'Add period'}
          </button>
        </div>
      </div>

      {(save.isError || remove.isError) && (
        <p className="text-xs text-danger mt-3">Something went wrong. Please try again.</p>
      )}
    </Modal>
  );
}

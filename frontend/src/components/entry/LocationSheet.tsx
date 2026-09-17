import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { MapPin, Plus, X } from 'lucide-react';
import type { JournalEntry } from '@cloudchat/shared';
import { api } from '~/lib/api';
import { staticMapUrl } from '~/lib/mapbox';
import { Sheet, SheetHeader } from '~/components/ui/Sheet';
import { Button } from '~/components/ui/Button';

export function LocationSheet({
  entry,
  open,
  onClose,
}: {
  entry: JournalEntry;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const locations = entry.locations ?? [];
  const scanned = Boolean(entry.locationsScannedAt);
  const mapUrl = staticMapUrl(locations);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['entry', entry.date] });
    qc.invalidateQueries({ queryKey: ['entries'] });
  };

  const add = useMutation({
    mutationFn: () => api.entries.addLocation(entry.date, name.trim()),
    onSuccess: () => {
      setName('');
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (locName: string) => api.entries.removeLocation(entry.date, locName),
    onSuccess: invalidate,
  });

  const status = scanned
    ? `Scanned ${format(new Date(entry.locationsScannedAt!), 'MMM d, HH:mm')}${
        locations.length === 0 ? ' · none found' : ''
      }`
    : 'Not scanned yet';

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader title="Places" onClose={onClose} />

      {mapUrl && (
        <img
          src={mapUrl}
          alt="Map of places mentioned"
          className="w-full block rounded-xl mb-3 ring-1 ring-gray-900/[0.06]"
        />
      )}

      <div className="flex items-center gap-1.5 mb-3">
        <span
          className={`w-1.5 h-1.5 rounded-full ${scanned ? 'bg-emerald-500' : 'bg-gray-300'}`}
        />
        <span className={`text-xs font-medium ${scanned ? 'text-emerald-600' : 'text-gray-400'}`}>
          {status}
        </span>
      </div>

      {locations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {locations.map((loc) => (
            <span
              key={loc.name}
              className="flex items-center gap-1 h-9 pl-2.5 pr-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium"
            >
              <MapPin size={12} strokeWidth={2.5} />
              {loc.name}
              <button
                type="button"
                onClick={() => remove.mutate(loc.name)}
                disabled={remove.isPending}
                aria-label={`Remove ${loc.name}`}
                className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 active:scale-90 transition-all disabled:opacity-50"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) add.mutate();
        }}
        className="flex items-center gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a place…"
          className="flex-1 min-w-0 text-sm text-gray-700 rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={!name.trim() || add.isPending}
          className="shrink-0"
        >
          <Plus size={15} strokeWidth={2.5} />
          {add.isPending ? 'Adding…' : 'Add'}
        </Button>
      </form>
      {add.isError && (
        <p className="text-xs text-rose-500 mt-2">
          Couldn't find that place. Try a more specific name.
        </p>
      )}
    </Sheet>
  );
}

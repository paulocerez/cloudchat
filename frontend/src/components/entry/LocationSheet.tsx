import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { MapPin, Plus, X } from 'lucide-react';
import type { JournalEntry, PlaceSuggestion } from '@cloudchat/shared';
import { api } from '~/lib/api';
import { staticMapUrl } from '~/lib/mapbox';
import { useTheme } from '~/lib/theme';
import { useDebounced } from '~/lib/useDebounced';
import { cn } from '~/lib/utils';
import { Sheet, SheetHeader } from '~/components/ui/Sheet';
import { Button } from '~/components/ui/Button';

// Matches the backend's floor — below it the search returns nothing anyway.
const MIN_QUERY = 2;

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
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(-1);
  const listId = useId();
  const locations = entry.locations ?? [];
  const scanned = Boolean(entry.locationsScannedAt);
  const { resolved } = useTheme();
  const mapUrl = staticMapUrl(locations, 600, 240, resolved);

  const debounced = useDebounced(query.trim(), 250);
  const searching = debounced.length >= MIN_QUERY;

  const { data, isFetching } = useQuery({
    queryKey: ['places', debounced],
    queryFn: () => api.places.search(debounced),
    enabled: searching,
    staleTime: 5 * 60_000,
  });
  const suggestions = searching ? (data?.results ?? []) : [];

  // A new set of results invalidates whatever row was highlighted.
  useEffect(() => setHighlight(-1), [debounced]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['entry', entry.date] });
    qc.invalidateQueries({ queryKey: ['entries'] });
  };

  const add = useMutation({
    mutationFn: (location: { name: string; latitude?: number; longitude?: number }) =>
      api.entries.addLocation(entry.date, location),
    onSuccess: () => {
      setQuery('');
      setHighlight(-1);
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (locName: string) => api.entries.removeLocation(entry.date, locName),
    onSuccess: invalidate,
  });

  const choose = (s: PlaceSuggestion) =>
    add.mutate({ name: s.label, latitude: s.latitude, longitude: s.longitude });

  // Enter on a highlighted row picks that place; otherwise it falls back to
  // geocoding whatever was typed, which is what the Add button does too.
  const submit = () => {
    const picked = suggestions[highlight];
    if (picked) choose(picked);
    else if (query.trim()) add.mutate({ name: query.trim() });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (suggestions.length === 0) return;
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      // Cycle through -1 (nothing highlighted, i.e. "add as typed") and 0…n-1.
      const slots = suggestions.length + 1;
      setHighlight((h) => ((h + 1 + step + slots) % slots) - 1);
    } else if (e.key === 'Escape' && query) {
      // Clear the search first; a second Escape closes the sheet.
      e.stopPropagation();
      setQuery('');
      setHighlight(-1);
    }
  };

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
          className="w-full block rounded-md mb-3 ring-1 ring-line"
        />
      )}

      <div className="flex items-center gap-1.5 mb-3">
        <span
          className={`w-1.5 h-1.5 rounded-md ${scanned ? 'bg-emerald-500' : 'bg-line-strong'}`}
        />
        <span className={`text-xs font-medium ${scanned ? 'text-emerald-600 dark:text-emerald-400' : 'text-faint'}`}>
          {status}
        </span>
      </div>

      {locations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {locations.map((loc) => (
            <span
              key={loc.name}
              className="flex items-center gap-1 h-9 pl-2.5 pr-1 rounded-md bg-sunken text-secondary text-xs font-medium"
            >
              <MapPin size={12} strokeWidth={2.5} />
              {loc.name}
              <button
                type="button"
                onClick={() => remove.mutate(loc.name)}
                disabled={remove.isPending}
                aria-label={`Remove ${loc.name}`}
                className="h-7 w-7 flex items-center justify-center rounded-md text-faint hover:text-strong hover:bg-sunken-hover active:scale-90 transition-all disabled:opacity-50"
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
          submit();
        }}
        className="flex items-center gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search for a place…"
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={highlight >= 0 ? `${listId}-${highlight}` : undefined}
          className="flex-1 min-w-0 text-sm text-strong rounded-md border border-line-strong px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={!query.trim() || add.isPending}
          className="shrink-0"
        >
          <Plus size={15} strokeWidth={2.5} />
          {add.isPending ? 'Adding…' : 'Add'}
        </Button>
      </form>

      {searching && (
        <div className="mt-2">
          {suggestions.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              aria-label="Place suggestions"
              className="max-h-64 overflow-y-auto rounded-md ring-1 ring-line bg-surface-2 p-1"
            >
              {suggestions.map((s, i) => (
                <li key={`${s.label}-${s.longitude},${s.latitude}`} role="none">
                  <button
                    type="button"
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === highlight}
                    disabled={add.isPending}
                    onClick={() => choose(s)}
                    onMouseEnter={() => setHighlight(i)}
                    className={cn(
                      'w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors disabled:opacity-50',
                      i === highlight ? 'bg-hover' : 'hover:bg-hover'
                    )}
                  >
                    <MapPin size={14} strokeWidth={2.5} className="mt-0.5 shrink-0 text-faint" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-strong truncate">
                        {s.name}
                      </span>
                      {s.context && (
                        <span className="block text-xs text-faint truncate">{s.context}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-faint px-1">
              {isFetching ? 'Searching…' : `No matches — “Add” saves “${debounced}” as typed.`}
            </p>
          )}
        </div>
      )}

      {add.isError && (
        <p className="text-xs text-danger mt-2">
          Couldn't find that place. Try a more specific name.
        </p>
      )}
    </Sheet>
  );
}

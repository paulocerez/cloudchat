const BERLIN = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// The journal day (YYYY-MM-DD) an instant belongs to, in the user's timezone.
// en-CA already formats as YYYY-MM-DD, so no reassembly is needed.
export function berlinDate(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  return BERLIN.format(isNaN(d.getTime()) ? new Date() : d);
}

export function berlinToday(): string {
  return berlinDate();
}

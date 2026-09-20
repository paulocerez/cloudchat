import { useEffect, useState } from 'react';

// Hold a value back until it has stopped changing for `ms`. Typing in the
// place picker fires a request per keystroke otherwise.
export function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);

  return debounced;
}

const SESSION_KEY = 'journal_authed_until';
const MASTER_PASSWORD = import.meta.env.VITE_MASTER_PASSWORD ?? 'journal';
const SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

export function isAuthenticated(): boolean {
  const until = Number(localStorage.getItem(SESSION_KEY));
  if (!until || Number.isNaN(until)) return false;
  if (Date.now() > until) {
    localStorage.removeItem(SESSION_KEY);
    return false;
  }
  return true;
}

export function login(password: string): boolean {
  if (password === MASTER_PASSWORD) {
    localStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_TTL_MS));
    return true;
  }
  return false;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

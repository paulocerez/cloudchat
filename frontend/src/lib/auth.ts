const SESSION_KEY = 'journal_authed';
const MASTER_PASSWORD = import.meta.env.VITE_MASTER_PASSWORD ?? 'journal';

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function login(password: string): boolean {
  if (password === MASTER_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    return true;
  }
  return false;
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

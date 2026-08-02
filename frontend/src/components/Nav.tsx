import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { Logo } from './Logo';
import { isAuthenticated, logout } from '~/lib/auth';

const TABS = [
  { to: '/',          label: 'Timeline'  },
  { to: '/summaries', label: 'Summaries' },
  { to: '/settings',  label: 'Settings'  },
] as const;

export default function Nav() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!isAuthenticated()) return null;

  function handleLogout() {
    logout();
    router.navigate({ to: '/login' });
  }

  return (
    <>
      {/* ── Top bar — logo only, generous height ─────────── */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 flex items-center h-16">
          <Link to="/" className="transition-opacity hover:opacity-70">
            <Logo size="md" />
          </Link>
        </div>
      </header>

      {/* ── Floating bottom nav ───────────────────────────── */}
      <nav className="fixed bottom-6 inset-x-0 z-20 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg shadow-black/5 px-2 py-2">
          {TABS.map(({ to, label }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {label}
              </Link>
            );
          })}
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all duration-150"
          >
            Logout
          </button>
        </div>
      </nav>
    </>
  );
}

import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { LogOut, BookOpen, WandSparkles, Settings } from 'lucide-react';
import { Logo } from './Logo';
import { isAuthenticated, logout } from '~/lib/auth';

const TABS = [
  { to: '/',          label: 'Timeline',  Icon: BookOpen  },
  { to: '/summaries', label: 'Summaries', Icon: WandSparkles },
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
      {/* ── Top bar ───────────────────────────────────────── */}
      <header className="sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 md:px-8 flex items-center justify-between h-16">
          <Link to="/" className="transition-opacity hover:opacity-70">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/settings"
              title="Settings"
              className="p-1.5 rounded-sm bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all duration-150"
            >
              <Settings size={15} strokeWidth={1.75} />
            </Link>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-sm bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all duration-150"
            >
              <LogOut size={15} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Floating bottom nav ───────────────────────────── */}
      <nav className="fixed bottom-6 inset-x-0 z-20 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 bg-white/70 backdrop-blur-xl border border-white/60 rounded-md shadow-lg shadow-black/10 px-2 py-2">
          {TABS.map(({ to, label, Icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                title={label}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-gray-900/85 backdrop-blur-sm text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-white/60 hover:backdrop-blur-sm'
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2 : 1.5} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

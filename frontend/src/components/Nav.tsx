import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { LogOut, BookOpen, WandSparkles, Settings } from 'lucide-react';
import { Logo } from './Logo';
import { isAuthenticated, logout } from '~/lib/auth';

const TABS = [
  { to: '/',          label: 'Timeline',  Icon: BookOpen  },
  { to: '/summaries', label: 'Summaries', Icon: WandSparkles },
  { to: '/settings',  label: 'Settings',  Icon: Settings  },
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
          <button
            onClick={handleLogout}
            title="Logout"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all duration-150"
          >
            <LogOut size={14} strokeWidth={1.75} />
            <span className="text-xs font-medium">Logout</span>
          </button>
        </div>
      </header>

      {/* ── Floating bottom nav ───────────────────────────── */}
      <nav className="fixed bottom-6 inset-x-0 z-20 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 bg-white/90 backdrop-blur-md border border-gray-200 rounded-full shadow-lg shadow-black/5 px-2 py-2">
          {TABS.map(({ to, label, Icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                title={label}
                className={`p-2.5 rounded-lg transition-all duration-150 ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.5} />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

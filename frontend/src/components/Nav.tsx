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
    <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="max-w-2xl mx-auto px-6 md:px-8 flex items-center justify-between h-14">
        {/* Logo */}
        <Link to="/" className="transition-opacity hover:opacity-70 shrink-0">
          <Logo size="md" />
        </Link>

        {/* Tab nav */}
        <nav className="flex items-center gap-1">
          {TABS.map(({ to, label, Icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon size={14} strokeWidth={active ? 2 : 1.5} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/settings"
            title="Settings"
            className={`p-2 rounded-lg transition-all duration-150 ${
              pathname === '/settings'
                ? 'bg-gray-900 text-white'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <Settings size={15} strokeWidth={1.75} />
          </Link>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all duration-150"
          >
            <LogOut size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}

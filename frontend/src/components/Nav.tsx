import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { Logo } from './Logo';
import { isAuthenticated, logout } from '~/lib/auth';
import { BookOpen, Sparkles, Settings, Lock } from 'lucide-react';

const TABS = [
  { to: '/',           label: 'Timeline',  Icon: BookOpen   },
  { to: '/summaries',  label: 'Summaries', Icon: Sparkles   },
  { to: '/settings',   label: 'Settings',  Icon: Settings   },
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
      {/* ── Desktop top nav ────────────────────────────────── */}
      <nav className="hidden md:block border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="transition-opacity hover:opacity-70">
              <Logo size="sm" />
            </Link>
            <div className="flex items-center gap-6">
              {TABS.map(({ to, label }) => {
                const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`relative text-sm transition-colors duration-150 group ${active ? 'text-gray-900 font-medium' : 'text-gray-400 hover:text-gray-900'}`}
                  >
                    {label}
                    <span className={`absolute -bottom-0.5 left-0 h-px bg-gray-900 transition-all duration-200 ${active ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                  </Link>
                );
              })}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-300 hover:text-gray-600 transition-colors duration-150"
          >
            Lock
          </button>
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ──────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white/90 backdrop-blur-md border-t border-gray-100 safe-bottom">
        <div className="flex items-stretch">
          {TABS.map(({ to, label, Icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors duration-150 active:bg-gray-50 ${active ? 'text-gray-900' : 'text-gray-400'}`}
              >
                <Icon size={20} strokeWidth={active ? 2 : 1.5} />
                <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-gray-900' : 'text-gray-400'}`}>
                  {label}
                </span>
              </Link>
            );
          })}
          {/* Lock tab */}
          <button
            onClick={handleLogout}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-gray-400 active:bg-gray-50 transition-colors"
          >
            <Lock size={20} strokeWidth={1.5} />
            <span className="text-[10px] font-medium tracking-wide">Lock</span>
          </button>
        </div>
      </nav>
    </>
  );
}

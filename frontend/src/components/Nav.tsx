import { Link, useRouterState } from '@tanstack/react-router';
import { Logo } from './Logo';
import { isAuthenticated } from '~/lib/auth';
import { isTabActive, TABS } from './navTabs';
import { ThemeToggle } from './ThemeToggle';

/**
 * Desktop top bar: mark and tabs grouped at the left edge, theme at the right.
 * Still no overflow button — the theme toggle is its own control, not a "…"
 * with one thing hidden behind it.
 *
 * There is no top bar below `lg`. The bottom tab bar carries navigation there,
 * each page's own heading names it, and the Timeline header carries the theme.
 */
export default function Nav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!isAuthenticated() || pathname === '/login') return null;

  return (
    <header className="chrome-blur hidden lg:block sticky top-0 z-30 h-14 bg-page/85 backdrop-blur-xl border-b border-line">
      <div className="h-full px-5 flex items-center gap-5">
        <Link to="/" className="shrink-0 transition-opacity hover:opacity-70" aria-label="Timeline">
          <Logo size="md" variant="plain" />
        </Link>

        <nav className="flex items-center gap-1">
          {TABS.map(({ to, label, Icon }) => {
            const active = isTabActive(to, pathname);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-[13.5px] font-medium transition-colors duration-150 ${
                  active
                    ? 'bg-active text-ink'
                    : 'text-muted hover:text-ink hover:bg-hover'
                }`}
              >
                <Icon size={15} strokeWidth={active ? 2 : 1.75} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center">
          <ThemeToggle size="sm" />
        </div>
      </div>
    </header>
  );
}

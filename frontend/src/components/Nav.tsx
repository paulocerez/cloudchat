import { Link, useRouterState } from '@tanstack/react-router';
import { Logo } from './Logo';
import { isAuthenticated } from '~/lib/auth';
import { isTabActive, TABS } from './navTabs';

/**
 * Desktop top bar: mark and tabs grouped at the left edge. There's no overflow
 * button — settings and logout are gone, and an empty "…" is worse than none.
 *
 * There is no top bar below `lg`. The bottom tab bar carries navigation there,
 * and each page's own heading names it.
 */
export default function Nav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!isAuthenticated() || pathname === '/login') return null;

  return (
    <header className="hidden lg:block sticky top-0 z-30 h-14 bg-white/85 backdrop-blur-xl border-b border-gray-900/[0.07]">
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
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13.5px] font-medium transition-colors duration-150 ${
                  active
                    ? 'bg-gray-900/[0.06] text-[#17171C]'
                    : 'text-[#71717D] hover:text-[#17171C] hover:bg-gray-900/[0.04]'
                }`}
              >
                <Icon size={15} strokeWidth={active ? 2 : 1.75} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

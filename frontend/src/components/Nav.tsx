import { useState } from 'react';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { LogOut, MoreHorizontal, Settings } from 'lucide-react';
import { Logo } from './Logo';
import { isAuthenticated, logout } from '~/lib/auth';
import { usePageTitle } from '~/lib/pageTitle';
import { Button } from './ui/Button';
import { MenuSheet } from './ui/MenuSheet';
import { isTabActive, TABS } from './navTabs';

/**
 * Top chrome. On a phone it carries the mark, the page's compact title once
 * you've scrolled past the large one, and an overflow button — the tabs moved
 * to the bottom bar, where a thumb can reach them. From `sm` up the tabs come
 * back inline and the title stays in the page, since the tabs already say
 * where you are.
 *
 * Detail screens hide it below `sm`: they pin their own header with a back
 * button, and stacking two 56px bars on a phone is most of the first screen.
 */
export default function Nav() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { title, compact } = usePageTitle();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isAuthenticated()) return null;

  const isDetail = pathname.startsWith('/entry/') || pathname.startsWith('/summary/');

  return (
    <header
      className={`sticky top-0 z-30 bg-white/70 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-900/[0.06] glass-surface ${
        isDetail ? 'max-sm:hidden' : ''
      }`}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8 flex items-center gap-2 h-14">
        <Link to="/" className="shrink-0 transition-opacity hover:opacity-70" aria-label="Timeline">
          <Logo size="md" />
        </Link>

        <span
          aria-hidden={!compact}
          className={`sm:hidden flex-1 min-w-0 truncate text-center text-sm font-semibold text-gray-900 tracking-[-0.01em] transition-opacity duration-200 ${
            compact ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {title}
        </span>

        <nav className="hidden sm:flex flex-1 items-center justify-center gap-1">
          {TABS.map(({ to, label, Icon }) => {
            const active = isTabActive(to, pathname);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon size={15} strokeWidth={active ? 2 : 1.5} />
                {label}
              </Link>
            );
          })}
        </nav>

        <Button
          variant="bare"
          size="icon"
          onClick={() => setMenuOpen(true)}
          aria-label="Menu"
          className={`shrink-0 ${pathname === '/settings' ? 'text-gray-900 bg-gray-500/10' : ''}`}
        >
          <MoreHorizontal size={19} strokeWidth={2.25} />
        </Button>
      </div>

      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={[
          {
            icon: Settings,
            label: 'Settings',
            onSelect: () => router.navigate({ to: '/settings' }),
          },
          {
            icon: LogOut,
            label: 'Log out',
            danger: true,
            onSelect: () => {
              logout();
              router.navigate({ to: '/login' });
            },
          },
        ]}
      />
    </header>
  );
}

import { useRef, useState } from 'react';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { LogOut, MoreHorizontal, Settings } from 'lucide-react';
import { Logo } from './Logo';
import { isAuthenticated, logout } from '~/lib/auth';
import { usePageTitle } from '~/lib/pageTitle';
import { Button } from './ui/Button';
import { MenuSheet } from './ui/MenuSheet';
import { isTabActive, TABS } from './navTabs';

/**
 * Top chrome, two shapes.
 *
 * Phone: mark, the page's compact title once you've scrolled past the large
 * one, and an overflow button. The tabs live in the bottom bar, where a thumb
 * can reach them. Detail screens hide this bar entirely and pin their own.
 *
 * Desktop: one centred toolbar — mark, a segmented tab control, overflow.
 * Spreading those to the window's edges leaves three lonely islands on a wide
 * monitor, and pinning them to the 672px content column left the overflow
 * button stranded a hundred pixels from the tabs. Grouped and centred, the
 * chrome sits over the column it belongs to and reads as one object.
 */
export default function Nav() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { title, compact } = usePageTitle();
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLSpanElement>(null);

  if (!isAuthenticated()) return null;

  const isDetail = pathname.startsWith('/entry/') || pathname.startsWith('/summary/');

  // Only the desktop row carries the anchor — it's the one the dropdown hangs
  // from, and the phone row gets a bottom sheet regardless.
  const overflow = (ref?: React.Ref<HTMLSpanElement>) => (
    <span ref={ref} className="shrink-0 inline-flex">
      <Button
        variant="bare"
        size="icon"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={menuOpen}
        className={pathname === '/settings' ? 'text-gray-900 bg-gray-500/10' : ''}
      >
        <MoreHorizontal size={19} strokeWidth={2.25} />
      </Button>
    </span>
  );

  return (
    <header
      className={`sticky top-0 z-30 bg-white/70 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-900/[0.06] glass-surface ${
        isDetail ? 'max-sm:hidden' : ''
      }`}
    >
      {/* Phone */}
      <div className="sm:hidden max-w-2xl mx-auto px-4 flex items-center gap-2 h-14">
        <Link to="/" className="shrink-0 transition-opacity hover:opacity-70" aria-label="Timeline">
          <Logo size="md" variant="plain" />
        </Link>
        <span
          aria-hidden={!compact}
          className={`flex-1 min-w-0 truncate text-center text-sm font-semibold text-gray-900 tracking-[-0.01em] transition-opacity duration-200 ${
            compact ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {title}
        </span>
        {overflow()}
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex items-center justify-center gap-2.5 h-14 px-6">
        <Link
          to="/"
          className="shrink-0 mr-1 transition-opacity hover:opacity-70"
          aria-label="Timeline"
        >
          <Logo size="md" variant="plain" />
        </Link>

        {/* Same segmented-control shape as the entry page's view toggle, rather
            than a solid black pill that shouts across an otherwise quiet bar. */}
        <nav className="flex items-center gap-0.5 p-0.5 rounded-xl bg-gray-900/[0.05]">
          {TABS.map(({ to, label, Icon }) => {
            const active = isTabActive(to, pathname);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/[0.04]'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon size={15} strokeWidth={active ? 2 : 1.5} />
                {label}
              </Link>
            );
          })}
        </nav>

        {overflow(moreRef)}
      </div>

      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={moreRef}
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

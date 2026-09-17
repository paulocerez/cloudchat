import { useRef, useState } from 'react';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { LogOut, MoreHorizontal, Settings } from 'lucide-react';
import { Logo } from './Logo';
import { isAuthenticated, logout } from '~/lib/auth';
import { usePageTitle } from '~/lib/pageTitle';
import { Button } from './ui/Button';
import { MenuSheet } from './ui/MenuSheet';

/**
 * Top chrome below `lg`, where there's no room for the sidebar: the mark, the
 * page's compact title once you've scrolled past the large one, and an
 * overflow button. Navigation itself lives in the bottom tab bar.
 *
 * Detail screens hide this entirely and pin their own header instead — two
 * stacked bars is most of a phone's first screen.
 */
export default function Nav() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { title, compact } = usePageTitle();
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLSpanElement>(null);

  if (!isAuthenticated()) return null;

  const isDetail = pathname.startsWith('/entry/') || pathname.startsWith('/summary/');
  if (isDetail) return null;

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white/70 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-900/[0.06] glass-surface">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 flex items-center gap-2 h-14">
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

        <span ref={moreRef} className="shrink-0 inline-flex">
          <Button
            variant="bare"
            size="icon"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal size={19} strokeWidth={2.25} />
          </Button>
        </span>
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

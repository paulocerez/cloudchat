import { useRef, useState } from 'react';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { LogOut, MoreHorizontal, Settings } from 'lucide-react';
import { Logo } from './Logo';
import { isAuthenticated, logout } from '~/lib/auth';
import { Button } from './ui/Button';
import { MenuSheet } from './ui/MenuSheet';
import { isTabActive, TABS } from './navTabs';

/**
 * Desktop top bar. Mark and tabs are grouped at the left edge and the overflow
 * sits at the right — the arrangement every desktop app uses, and the one that
 * avoids both failure modes we hit before: a toolbar island stranded in the
 * middle of a wide window, and three lonely elements spread to its corners.
 *
 * There is no top bar below `lg`. The bottom tab bar carries navigation there,
 * and each page's own heading names it.
 */
export default function Nav() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLSpanElement>(null);

  if (!isAuthenticated() || pathname === '/login') return null;

  return (
    <header className="hidden lg:block sticky top-0 z-30 h-14 bg-white/85 backdrop-blur-xl border-b border-gray-900/[0.07]">
      <div className="h-full px-5 flex items-center gap-5">
        <Link
          to="/"
          className="shrink-0 transition-opacity hover:opacity-70"
          aria-label="Timeline"
        >
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

        <span ref={moreRef} className="ml-auto shrink-0 inline-flex">
          <Button
            variant="bare"
            size="icon"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className={pathname === '/settings' ? 'text-[#17171C] bg-gray-900/[0.05]' : ''}
          >
            <MoreHorizontal size={18} strokeWidth={2.25} />
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

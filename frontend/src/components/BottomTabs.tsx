import { useState } from 'react';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { LogOut, MoreHorizontal, Settings } from 'lucide-react';
import { logout } from '~/lib/auth';
import { MenuSheet } from './ui/MenuSheet';
import { isTabActive, TABS } from './navTabs';

/**
 * All of the phone's navigation, in thumb reach and inside the safe area.
 * There's no top bar below `lg`, so this also carries the app menu that used
 * to live up there — a fourth tab rather than a hidden gesture.
 *
 * Detail screens (an entry, a summary) hide it: they own the bottom edge with
 * a composer, and offer their own way back.
 */
export function BottomTabs() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  const cell =
    'flex flex-col items-center justify-center gap-1 h-14 transition-colors duration-150 active:scale-[0.97]';

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-900/[0.07] bg-white/90 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
          {TABS.map(({ to, label, Icon }) => {
            const active = isTabActive(to, pathname);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`${cell} ${active ? 'text-[#17171C]' : 'text-[#A6A6B0]'}`}
              >
                {/* Stroke weight carries the active state — no pill, so the
                    bar stays quiet under the content. */}
                <Icon size={21} strokeWidth={active ? 2.25 : 1.75} />
                <span
                  className={`text-[10px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}
                >
                  {label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="More"
            aria-expanded={menuOpen}
            className={`${cell} ${
              pathname === '/settings' || menuOpen ? 'text-[#17171C]' : 'text-[#A6A6B0]'
            }`}
          >
            <MoreHorizontal size={21} strokeWidth={1.75} />
            <span className="text-[10px] leading-none font-medium">More</span>
          </button>
        </div>
      </nav>

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
    </>
  );
}

import { useRef, useState } from 'react';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { isAuthenticated, logout } from '~/lib/auth';
import { MenuSheet } from './ui/MenuSheet';
import { isTabActive, TABS } from './navTabs';

/**
 * Desktop navigation, Linear-style: a quiet left rail rather than a toolbar
 * floating in the middle of the window. Everything is left-aligned and small —
 * 13px rows, 16px icons, a tinted surface and a hairline instead of shadows —
 * so the chrome recedes and the day's content is the only loud thing.
 *
 * Below `lg` this is gone and the bottom tab bar takes over.
 */
export function Sidebar() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const workspaceRef = useRef<HTMLButtonElement>(null);

  if (!isAuthenticated()) return null;

  const rowBase =
    'flex items-center gap-2 h-8 px-2 rounded-md text-[13px] font-medium transition-colors duration-100';

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-56 flex-col gap-1 border-r border-white/60 bg-white/35 backdrop-blur-2xl px-3 py-3">
      {/* Workspace row — the mark doubles as the app menu, the way Linear's
          workspace switcher does. */}
      <button
        ref={workspaceRef}
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        className="flex items-center gap-2 h-9 px-2 -mx-0.5 rounded-md hover:bg-white/60 active:scale-[0.99] transition-all"
      >
        <span className="font-bold text-red-600 italic tracking-tight leading-none text-base">
          cc
        </span>
        <span className="text-[13px] font-semibold text-[#241F2E] tracking-[-0.01em]">
          Cloudchat
        </span>
        <ChevronDown size={14} strokeWidth={2} className="ml-auto text-gray-400" />
      </button>

      <nav className="mt-3 flex flex-col gap-0.5">
        {TABS.map(({ to, label, Icon }) => {
          const active = isTabActive(to, pathname);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={`${rowBase} ${
                active
                  ? 'surface-solid text-[#241F2E]'
                  : 'text-[#7A6F93] hover:bg-white/60 hover:text-[#241F2E]'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.75} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <Link
        to="/settings"
        aria-current={pathname === '/settings' ? 'page' : undefined}
        className={`${rowBase} mt-auto ${
          pathname === '/settings'
            ? 'surface-solid text-[#241F2E]'
            : 'text-[#9990AD] hover:bg-white/60 hover:text-[#241F2E]'
        }`}
      >
        <Settings size={16} strokeWidth={1.75} className="shrink-0" />
        Settings
      </Link>

      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={workspaceRef}
        align="start"
        items={[
          { icon: Settings, label: 'Settings', onSelect: () => router.navigate({ to: '/settings' }) },
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
    </aside>
  );
}

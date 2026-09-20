import { Link, useRouterState } from '@tanstack/react-router';
import { isTabActive, TABS } from './navTabs';

/**
 * All of the phone's navigation, in thumb reach and inside the safe area.
 * There's no top bar below `lg`, and nothing else to reach for — the "More"
 * tab went with settings and logout.
 *
 * Detail screens (an entry, a summary) hide it: they own the bottom edge with
 * a composer, and offer their own way back.
 */
export function BottomTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="chrome-blur lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-page/90 backdrop-blur-xl">
      <div className="max-w-2xl mx-auto grid grid-cols-3 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ to, label, Icon }) => {
          const active = isTabActive(to, pathname);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 h-14 transition-colors duration-150 active:scale-[0.97] ${
                active ? 'text-ink' : 'text-faint'
              }`}
            >
              {/* Stroke weight carries the active state — no pill, so the bar
                  stays quiet under the content. */}
              <Icon size={21} strokeWidth={active ? 2.25 : 1.75} />
              <span
                className={`text-[10px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

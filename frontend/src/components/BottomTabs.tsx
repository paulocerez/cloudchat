import { Link, useRouterState } from '@tanstack/react-router';
import { isTabActive, TABS } from './navTabs';

/**
 * The phone's primary navigation, in thumb reach and inside the safe area.
 * Detail screens (an entry, a summary) hide it — they own the bottom edge with
 * a composer or a back affordance, and stacking two bars there reads as a mess.
 */
export function BottomTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/55 backdrop-blur-2xl backdrop-saturate-150 glass-surface">
      <div className="max-w-2xl mx-auto grid grid-cols-3 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ to, label, Icon }) => {
          const active = isTabActive(to, pathname);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 h-14 transition-colors duration-150 active:scale-[0.97] ${
                active ? 'text-[#241F2E]' : 'text-[#B6ADC9]'
              }`}
            >
              {/* Stroke weight carries the active state, the way the top bar
                  already did — no pill, so the bar stays quiet. */}
              <Icon size={21} strokeWidth={active ? 2.25 : 1.75} />
              <span className={`text-[10px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

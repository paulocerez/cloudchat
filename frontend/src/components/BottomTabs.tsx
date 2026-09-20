import { Link, useRouterState } from '@tanstack/react-router';
import { isTabActive, TABS } from './navTabs';

/**
 * All of the phone's navigation, in thumb reach and inside the safe area.
 * There's no top bar below `lg`, and nothing else to reach for — the "More"
 * tab went with settings and logout.
 *
 * It floats as a detached capsule rather than a docked bar: the content runs
 * under it to the bottom of the screen, which on a tall phone is the
 * difference between a list that ends and a list that continues.
 *
 * Detail screens (an entry, a summary) hide it: they own the bottom edge with
 * a composer, and offer their own way back.
 */
export function BottomTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Main"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 grid place-items-center pointer-events-none pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
    >
      {/* In light mode --surface-2 is the same white as the page, so the ring
          and the drop are the only things separating the capsule from what's
          behind it. They're structural here, not decoration. */}
      <div className="tab-capsule pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl bg-surface-2/85 backdrop-blur-xl ring-1 ring-line shadow-[var(--surface-shadow)]">
        {TABS.map(({ to, label, Icon }) => {
          const active = isTabActive(to, pathname);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              title={label}
              className={`h-11 w-14 grid place-items-center rounded-xl transition-colors duration-150 active:scale-[0.97] ${
                // The chip carries the active state now, so the icon doesn't
                // also have to thicken — one signal is enough, and a capsule
                // this small gets noisy fast.
                active ? 'bg-active text-ink' : 'text-faint'
              }`}
            >
              <Icon size={21} strokeWidth={1.9} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

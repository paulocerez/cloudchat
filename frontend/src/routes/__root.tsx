import { createRootRoute, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { isAuthenticated } from '~/lib/auth';
import Nav from '~/components/Nav';
import { BottomTabs } from '~/components/BottomTabs';

export const rootRoute = createRootRoute({
  beforeLoad: ({ location }) => {
    if (!isAuthenticated() && location.pathname !== '/login') {
      throw redirect({ to: '/login' });
    }
  },
  component: RootLayout,
});

function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isLogin = pathname === '/login';
  const isEntry = pathname.startsWith('/entry/');
  // Detail screens are pushed, not switched between: they own the bottom edge
  // (the entry page pins a composer there) and offer their own way back.
  const isDetail = isEntry || pathname.startsWith('/summary/');
  const showTabs = !isLogin && !isDetail;

  return (
    <div className="min-h-screen text-ink">
      <Nav />
      <main
        className={`max-w-2xl mx-auto px-4 sm:px-6 md:px-8 py-8 ${
          // The entry page reserves its own room for the composer it pins.
          isEntry
            ? ''
            : showTabs
              ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-16'
              : 'pb-16'
        }`}
      >
        <Outlet />
      </main>
      {showTabs && <BottomTabs />}
    </div>
  );
}

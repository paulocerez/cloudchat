import { createRootRoute, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { isAuthenticated } from '~/lib/auth';
import Nav from '~/components/Nav';
import { BottomTabs } from '~/components/BottomTabs';
import JournalChat from '~/components/JournalChat';

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
  // Detail screens are pushed, not switched between: they own the bottom edge
  // (the entry page pins a composer there) and offer their own way back.
  const isDetail = pathname.startsWith('/entry/') || pathname.startsWith('/summary/');
  const showTabs = !isLogin && !isDetail;
  const showChat = !isLogin && !pathname.startsWith('/entry/');

  // The entry page reserves its own room for the composer it pins.
  const bottomPad = pathname.startsWith('/entry/')
    ? ''
    : showTabs
      ? 'pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:pb-28'
      : 'pb-28';

  return (
    <div className="min-h-screen text-gray-900">
      <Nav />
      <main className={`max-w-2xl mx-auto px-4 sm:px-6 md:px-8 py-8 ${bottomPad}`}>
        <Outlet />
      </main>
      {showChat && <JournalChat raised={showTabs} />}
      {showTabs && <BottomTabs />}
    </div>
  );
}

import { createRootRoute, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { isAuthenticated } from '~/lib/auth';
import Nav from '~/components/Nav';
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
  // The entry page pins its own composer to the bottom edge, so the floating
  // chat button would land on top of it — and the page reserves its own room.
  const showChat = pathname !== '/login' && !pathname.startsWith('/entry/');
  return (
    <div className="min-h-screen text-gray-900">
      <Nav />
      <main className={`max-w-2xl mx-auto px-4 sm:px-6 md:px-8 py-8 ${showChat ? 'pb-28' : ''}`}>
        <Outlet />
      </main>
      {showChat && <JournalChat />}
    </div>
  );
}

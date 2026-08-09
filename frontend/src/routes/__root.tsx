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
  return (
    <div className="min-h-screen text-gray-900">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8 py-8 pb-28">
        <Outlet />
      </main>
      {pathname !== '/login' && <JournalChat />}
    </div>
  );
}

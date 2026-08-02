import { createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import { isAuthenticated } from '~/lib/auth';
import Nav from '~/components/Nav';

export const rootRoute = createRootRoute({
  beforeLoad: ({ location }) => {
    if (!isAuthenticated() && location.pathname !== '/login') {
      throw redirect({ to: '/login' });
    }
  },
  component: () => (
    <div className="min-h-screen text-gray-900">
      <Nav />
      <main className="max-w-2xl mx-auto px-6 md:px-8 py-8 pb-28">
        <Outlet />
      </main>
    </div>
  ),
});

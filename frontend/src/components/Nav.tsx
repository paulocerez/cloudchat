import { Link, useRouter } from '@tanstack/react-router';
import { Logo } from './Logo';
import { isAuthenticated, logout } from '~/lib/auth';

export default function Nav() {
  const router = useRouter();

  if (!isAuthenticated()) return null;

  function handleLogout() {
    logout();
    router.navigate({ to: '/login' });
  }

  return (
    <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="transition-opacity hover:opacity-70">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-6">
            {[
              { to: '/', label: 'Timeline' },
              { to: '/summaries', label: 'Summaries' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="relative text-sm text-gray-400 hover:text-gray-900 transition-colors duration-150 group [&.active]:text-gray-900 [&.active]:font-medium"
              >
                {label}
                {/* animated underline */}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gray-900 transition-all duration-200 group-hover:w-full group-[.active]:w-full" />
              </Link>
            ))}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-300 hover:text-gray-600 transition-colors duration-150"
        >
          Lock
        </button>
      </div>
    </nav>
  );
}

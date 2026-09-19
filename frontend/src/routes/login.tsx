import { createRoute, redirect, useRouter } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { login, isAuthenticated } from '~/lib/auth';
import { rootRoute } from './__root';
import { Logo } from '~/components/Logo';

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (isAuthenticated()) throw redirect({ to: '/' });
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) inputRef.current?.focus();
  }, [shakeKey]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (login(password)) {
      router.navigate({ to: '/' });
    } else {
      setError(true);
      setShakeKey((k) => k + 1);
      setPassword('');
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden">
      <div className="relative w-full max-w-sm px-4 sm:px-6 animate-fade-up">

        <div className="bg-white border border-gray-200 rounded-sm shadow-sm px-8 py-10">
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="animate-logo">
              <Logo size="lg" />
            </div>
            <div className="text-center animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
                Paulo's Journal
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">Enter your password to continue</p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-3 animate-fade-up"
            style={{ animationDelay: '0.18s' }}
          >
            <div key={shakeKey} className={error ? 'animate-shake' : ''}>
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="Master password"
                autoFocus
                className={`w-full px-4 py-2.5 rounded-sm bg-white border text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-all duration-200 ${
                  error
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-gray-900'
                }`}
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center animate-fade-up">
                Incorrect password — try again
              </p>
            )}

            <button
              type="submit"
              className="btn-shimmer w-full py-2.5 rounded-sm bg-gray-900 text-white font-medium text-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              Unlock
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

import { createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '~/lib/api';
import { rootRoute } from './__root';
import type { AppConfig } from '@cloudchat/shared';

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

type EditableKey = keyof Omit<AppConfig, '_sources'>;

const FIELDS: {
  key: EditableKey;
  label: string;
  hint: string;
  sensitive?: boolean;
  placeholder: string;
}[] = [
  {
    key: 'whatsappToken',
    label: 'WhatsApp Access Token',
    hint: 'Permanent token from Meta System User',
    sensitive: true,
    placeholder: 'EAAxxxxxxx…',
  },
  {
    key: 'whatsappPhoneNumberId',
    label: 'Phone Number ID',
    hint: 'From WhatsApp → API Setup in Meta developer console',
    placeholder: '123456789012345',
  },
  {
    key: 'userPhoneNumber',
    label: 'Your WhatsApp Number',
    hint: 'With country code, no + (e.g. 4917612345678)',
    placeholder: '4917612345678',
  },
];

function sourceBadge(source: 'db' | 'env' | 'unset') {
  if (source === 'db')
    return (
      <span className="text-xs px-1.5 py-0.5 rounded-md bg-gray-900 text-white font-medium">
        overridden
      </span>
    );
  if (source === 'env')
    return (
      <span className="text-xs px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 font-medium">
        from env
      </span>
    );
  return (
    <span className="text-xs px-1.5 py-0.5 rounded-md bg-red-50 text-red-400 font-medium">
      unset
    </span>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: cfg, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: api.config.get,
  });

  const [form, setForm] = useState<Partial<Omit<AppConfig, '_sources'>>>({});
  const [saved, setSaved] = useState(false);

  // Pre-fill form with empty strings so controlled inputs don't flicker
  useEffect(() => {
    if (cfg) {
      setForm({
        whatsappToken: '',
        whatsappPhoneNumberId: cfg.whatsappPhoneNumberId,
        userPhoneNumber: cfg.userPhoneNumber,
        cronSchedule: cfg.cronSchedule,
        timezone: cfg.timezone,
      });
    }
  }, [cfg]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => api.config.update(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const { mutate: clearKey } = useMutation({
    mutationFn: (key: string) => api.config.clearKey(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['config'] }),
  });

  if (isLoading) {
    return (
      <div className="animate-fade-up space-y-4 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-32 mb-2" />
            <div className="h-9 bg-gray-100 rounded-lg w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Settings</h1>
      <p className="text-gray-400 text-sm mb-8">
        Override environment variables. Values saved here take precedence over Vercel env vars.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-6"
      >
        {FIELDS.map(({ key, label, hint, sensitive, placeholder }) => {
          const source = cfg?._sources?.[key] ?? 'unset';
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  {sourceBadge(source)}
                </div>
                {source === 'db' && (
                  <button
                    type="button"
                    onClick={() => clearKey(key)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Remove override
                  </button>
                )}
              </div>
              <input
                type={sensitive ? 'password' : 'text'}
                value={form[key] ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={
                  source === 'db'
                    ? sensitive
                      ? '••••••••  (set — enter new value to change)'
                      : `${cfg?.[key] ?? ''} (set — enter new value to change)`
                    : source === 'env'
                      ? `Set via env var — enter value to override`
                      : placeholder
                }
                className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-400 mt-1">{hint}</p>
            </div>
          );
        })}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
          {saved && (
            <span className="text-sm text-gray-500 animate-fade-up">✓ Saved</span>
          )}
        </div>
      </form>

      <div className="mt-12 pt-6 border-t border-gray-100">
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong className="text-gray-600">How this works:</strong> values saved here are stored in
          Firestore and take precedence over Vercel environment variables at runtime. Leave a field
          empty to keep using the env var. Use <em>Remove override</em> to revert a field back to
          its env var.
        </p>
      </div>
    </div>
  );
}

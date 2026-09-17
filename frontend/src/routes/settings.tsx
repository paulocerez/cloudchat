import { createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '~/lib/api';
import { PageHeader } from '~/components/ui/PageHeader';
import { rootRoute } from './__root';
import type { AppConfig } from '@cloudchat/shared';

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

type EditableKey = keyof Omit<AppConfig, '_sources' | '_integrations'>;

const FIELDS: {
  key: EditableKey;
  label: string;
  hint: string;
  sensitive?: boolean;
  placeholder: string;
}[] = [
  {
    key: 'unipileApiKey',
    label: 'Unipile API Key',
    hint: 'X-API-KEY from your Unipile dashboard',
    sensitive: true,
    placeholder: 'xxxxxxxx…',
  },
  {
    key: 'unipileDsn',
    label: 'Unipile DSN',
    hint: 'Your instance base URL, e.g. https://api8.unipile.com:13445',
    placeholder: 'https://apiXX.unipile.com:XXXXX',
  },
  {
    key: 'unipileAccountId',
    label: 'Unipile Account ID',
    hint: 'The id of your connected WhatsApp account',
    placeholder: 'dfXlh46vQYCsMbVarumWlg',
  },
  {
    key: 'userPhoneNumber',
    label: 'Your WhatsApp Number',
    hint: 'Your own number, country code, no + (used for the self-chat)',
    placeholder: '4917612345678',
  },
  {
    key: 'pocketApiKey',
    label: 'Pocket API Key',
    hint: 'pk_… from your Pocket account — reads recordings and audio',
    sensitive: true,
    placeholder: 'pk_xxxxxxxx…',
  },
  {
    key: 'pocketWebhookSecret',
    label: 'Pocket Webhook Secret',
    hint: 'Signing secret Pocket shows once when you create the webhook',
    sensitive: true,
    placeholder: 'whsec_xxxxxxxx…',
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
        unipileApiKey: '',
        unipileDsn: cfg.unipileDsn,
        unipileAccountId: cfg.unipileAccountId,
        userPhoneNumber: cfg.userPhoneNumber,
        cronSchedule: cfg.cronSchedule,
        pocketApiKey: '',
        pocketWebhookSecret: '',
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
      <PageHeader
        title="Settings"
        subtitle="Override environment variables. Values saved here take precedence over Vercel env vars."
        className="mb-8"
      />

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
        <p className="text-sm font-medium text-gray-700 mb-2">Pocket webhook</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          Point your Pocket webhook at this URL so recordings land on the day's entry:
        </p>
        <code className="mt-2 block text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 break-all">
          {`${import.meta.env.VITE_API_URL ?? window.location.origin}/webhook/pocket`}
        </code>
      </div>

      <div className="mt-12 pt-6 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-700 mb-3">Integrations</p>
        <div className="space-y-2">
          {[
            { key: 'groq', label: 'Groq (AI summaries)', envVar: 'GROQ_API_KEY' },
            { key: 'mapbox', label: 'Mapbox (location maps)', envVar: 'MAPBOX_TOKEN' },
          ].map(({ key, label, envVar }) => {
            const present = cfg?._integrations?.[key] ?? false;
            return (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400">
                    <code>{envVar}</code>
                  </p>
                </div>
                {present ? (
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-green-50 text-green-600 font-medium">
                    connected
                  </span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-red-50 text-red-400 font-medium">
                    missing
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          These are set via environment variables only. Add the missing token in your backend env to
          enable the feature.
        </p>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100">
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

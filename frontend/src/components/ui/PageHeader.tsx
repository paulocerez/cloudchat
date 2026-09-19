import { cn } from '~/lib/utils';

/**
 * One heading shape for every route. Below `lg` there's no top bar, so this is
 * the only thing naming the page — which is also why it stays put through the
 * loading and empty states.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-6', className)}>
      {/* Wraps rather than squeezes: the calendar's month stepper drops onto
          its own right-aligned row at phone widths instead of colliding with
          "September 2026". */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold tracking-wide uppercase text-muted mb-1">
              {eyebrow}
            </p>
          )}
          <h1 className="text-[30px] font-semibold text-ink tracking-[-0.028em] leading-[1.12] [font-optical-sizing:auto] text-balance">
            {title}
          </h1>
        </div>
        {actions && <div className="shrink-0 ml-auto flex items-center gap-1">{actions}</div>}
      </div>
      {subtitle && <p className="text-sm text-muted mt-1.5">{subtitle}</p>}
    </header>
  );
}

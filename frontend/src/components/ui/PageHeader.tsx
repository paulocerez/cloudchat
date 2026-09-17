import { cn } from '~/lib/utils';

/**
 * One heading shape for every route. Pages used to disagree — the timeline was
 * text-2xl bold, everything else text-lg semibold — which made the app feel
 * like four apps once the nav stopped carrying the page name.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-6', className)}>
      {/* Wraps rather than squeezes: the calendar's month stepper drops onto
          its own right-aligned row at phone widths instead of colliding with
          "September 2025". */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-medium tracking-wide uppercase text-gray-400 mb-1">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-bold text-gray-900 tracking-[-0.02em] leading-[1.1] [font-optical-sizing:auto] text-balance">
            {title}
          </h1>
        </div>
        {actions && <div className="shrink-0 ml-auto flex items-center gap-1">{actions}</div>}
      </div>
      {subtitle && <p className="text-sm text-gray-400 mt-1.5">{subtitle}</p>}
    </header>
  );
}

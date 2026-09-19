import { useEffect, useRef } from 'react';
import { cn } from '~/lib/utils';
import { usePageTitle } from '~/lib/pageTitle';

/**
 * One heading shape for every route. Pages used to disagree — the timeline was
 * text-2xl bold, everything else text-lg semibold — which made the app feel
 * like four apps once the nav stopped carrying the page name.
 *
 * It also hands its title to the nav, which shows a compact copy once this one
 * has scrolled away.
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
  const { setTitle, setCompact } = usePageTitle();
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setTitle(title);
    return () => {
      setTitle('');
      setCompact(false);
    };
  }, [title, setTitle, setCompact]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // The nav is 56px tall and sticky, so the handover happens exactly as the
    // large title passes under it.
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting), {
      rootMargin: '-56px 0px 0px 0px',
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [setCompact]);

  return (
    <header className={cn('mb-6', className)}>
      {/* Wraps rather than squeezes: the calendar's month stepper drops onto
          its own right-aligned row at phone widths instead of colliding with
          "September 2025". */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold tracking-wide uppercase text-[#8B7FA6] mb-1">
              {eyebrow}
            </p>
          )}
          <h1
            ref={ref}
            className="text-[30px] font-semibold text-[#241F2E] tracking-[-0.028em] leading-[1.15] [font-optical-sizing:auto] text-balance"
          >
            {title}
          </h1>
        </div>
        {actions && <div className="shrink-0 ml-auto flex items-center gap-1">{actions}</div>}
      </div>
      {subtitle && <p className="text-sm text-[#8B7FA6] mt-1.5">{subtitle}</p>}
    </header>
  );
}

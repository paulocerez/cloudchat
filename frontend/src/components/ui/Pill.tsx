import { cn } from '~/lib/utils';

// A single property chip in the entry header tray. Renders as a button when
// it's tappable and a plain span when it's read-only metadata, so screen
// readers and the keyboard don't get a row of dead buttons.
export function Pill({
  icon: Icon,
  label,
  value,
  onClick,
  active = false,
  className,
  title,
}: {
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label?: React.ReactNode;
  value?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  title?: string;
}) {
  const body = (
    <>
      {Icon && <Icon size={13} strokeWidth={2.5} className="shrink-0" />}
      {label != null && <span className="truncate">{label}</span>}
      {value != null && <span className="tabular-nums text-faint">{value}</span>}
    </>
  );

  const base = cn(
    'inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-xs font-medium',
    // `raised`, not `surface`: the pill has to read as lifted off its tray,
    // which in dark means stepping up from the tray rather than to the page.
    'bg-raised ring-1 ring-line shadow-[0_1px_1.5px_rgba(0,0,0,0.03)]',
    active ? 'text-ink' : 'text-secondary',
    className
  );

  if (!onClick) {
    return (
      <span className={base} title={title}>
        {body}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={label == null ? title : undefined}
      className={cn(base, 'hover:bg-raised-hover active:scale-[0.97] transition-all')}
    >
      {body}
    </button>
  );
}

// The recessed tray the pills sit in. Wraps freely; on a phone it lands on two
// rows at most for a busy day.
export function PillTray({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-1.5 rounded-md bg-sunken p-1.5', className)}
      {...props}
    />
  );
}

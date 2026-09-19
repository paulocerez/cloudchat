import { cn } from '~/lib/utils';

/**
 * The one raised surface in the app: frosted, so the page's colour wash tints
 * it, with a generous radius. `solid` for anything holding dense text, where
 * the blur behind it costs more than it gives.
 */
export function Card({
  className,
  solid = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { solid?: boolean }) {
  return (
    <div
      className={cn('rounded-sm', solid ? 'surface-solid' : 'surface', className)}
      {...props}
    />
  );
}

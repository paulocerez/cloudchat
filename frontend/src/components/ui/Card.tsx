import { cn } from '~/lib/utils';

// The white surface used for every raised block in the app.
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl bg-white ring-1 ring-gray-900/[0.06] shadow-sm', className)}
      {...props}
    />
  );
}

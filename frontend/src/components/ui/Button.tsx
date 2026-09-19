import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';

// The house button vocabulary. Everything squishes on press rather than
// flashing a hover colour — on a phone hover doesn't exist, and the squish is
// the only feedback you get before the network answers.
export const button = cva(
  'inline-flex items-center justify-center gap-1.5 font-medium select-none transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.96]',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-on-ink shadow-[0_6px_16px_-6px_var(--ink-shadow)] hover:bg-ink-hover',
        secondary: 'surface-solid text-strong hover:bg-surface-hover',
        ghost: 'text-muted hover:text-ink hover:bg-hover',
        danger: 'text-danger hover:bg-danger-wash',
        // Circular chrome button, on a hairline card.
        icon: 'rounded-md surface-solid text-secondary hover:text-ink hover:bg-surface-hover',
        // Bare icon, no chip behind it.
        bare: 'rounded-md text-faint hover:text-ink hover:bg-hover',
      },
      size: {
        sm: 'h-8 px-3 rounded-md text-xs',
        md: 'h-10 px-4 rounded-md text-sm',
        // Thumb-sized squares without inflating the glyph.
        icon: 'h-9 w-9 shrink-0',
        iconLg: 'h-10 w-10 shrink-0',
        // A full-width row inside a sheet.
        row: 'h-12 w-full px-3 rounded-md text-[15px] justify-start gap-3',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(button({ variant, size }), className)} {...props} />;
}

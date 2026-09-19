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
        primary: 'bg-[#241F2E] text-white shadow-[0_6px_16px_-6px_rgba(36,31,46,0.5)] hover:bg-[#332B42]',
        secondary: 'surface-solid text-gray-700 hover:bg-white',
        ghost: 'text-gray-500 hover:text-gray-900 hover:bg-gray-900/[0.05]',
        danger: 'text-rose-600 hover:bg-rose-500/10',
        // Circular chrome button on the frosted surface.
        icon: 'rounded-full surface-solid text-gray-600 hover:text-gray-900',
        // Bare icon, no chip behind it.
        bare: 'rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-900/[0.05]',
      },
      size: {
        sm: 'h-8 px-3 rounded-full text-xs',
        md: 'h-10 px-4 rounded-full text-sm',
        // Thumb-sized squares without inflating the glyph.
        icon: 'h-9 w-9 shrink-0',
        iconLg: 'h-10 w-10 shrink-0',
        // A full-width row inside a sheet.
        row: 'h-12 w-full px-3 rounded-2xl text-[15px] justify-start gap-3',
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

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';

// The house button vocabulary, previously copy-pasted a dozen times across
// routes. Press-scale is part of the variant because it tracks target size:
// big text buttons barely move, small icon buttons squash noticeably.
export const button = cva(
  'inline-flex items-center justify-center gap-1.5 font-medium select-none transition-all disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.97]',
        secondary: 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-[0.97]',
        ghost: 'text-gray-500 hover:text-gray-900 hover:bg-gray-500/10 active:scale-[0.97]',
        danger: 'text-rose-600 hover:bg-rose-50 active:scale-[0.97]',
        // Circular chrome button — the Linear header shape.
        icon: 'rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 active:scale-90',
        // Bare icon, no chip behind it.
        bare: 'rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-500/10 active:scale-90',
      },
      size: {
        sm: 'h-8 px-3 rounded-lg text-xs',
        md: 'h-10 px-4 rounded-lg text-sm',
        // 36/40px squares: thumb-sized without inflating the glyph.
        icon: 'h-9 w-9 shrink-0',
        iconLg: 'h-10 w-10 shrink-0',
        // A full-width row inside a sheet.
        row: 'h-12 w-full px-3 rounded-xl text-[15px] justify-start gap-3',
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

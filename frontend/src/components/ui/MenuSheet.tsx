import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sheet, useEscape, useIsCompact } from './Sheet';
import { Button } from './Button';
import { cn } from '~/lib/utils';

export interface MenuItem {
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  glyph?: React.ReactNode;
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/**
 * The menu behind any "…".
 *
 * On a phone it's a bottom sheet — full-width rows are the only shape that's
 * comfortable to hit with a thumb, and it's the same one the long-press menus
 * on timeline items use.
 *
 * On a pointer device, when given the button that opened it, it's a dropdown
 * anchored under that button instead. Dimming and blurring a whole 3000px
 * window to offer two items is the wrong weight for a mouse.
 */
export function MenuSheet({
  open,
  onClose,
  title,
  items,
  closeOnSelect = true,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  items: MenuItem[];
  /** Off for rows that report progress in place, like "Generating…". */
  closeOnSelect?: boolean;
  /** Anchor for the desktop dropdown. Without it, desktop gets the dialog. */
  anchorRef?: React.RefObject<HTMLElement | null>;
}) {
  const compact = useIsCompact();

  const choose = (item: MenuItem) => () => {
    if (closeOnSelect) onClose();
    item.onSelect();
  };

  if (anchorRef && !compact) {
    return (
      <AnchoredMenu open={open} onClose={onClose} anchorRef={anchorRef}>
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={choose(item)}
            className={cn(
              'w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm font-medium text-left transition-colors disabled:opacity-50',
              item.danger
                ? 'text-rose-600 hover:bg-rose-50'
                : 'text-gray-700 hover:bg-gray-500/10'
            )}
          >
            <Glyph item={item} size={16} />
            {item.label}
          </button>
        ))}
      </AnchoredMenu>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} className="max-w-sm">
      {title && (
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-gray-400 truncate">
          {title}
        </p>
      )}
      <div className="flex flex-col">
        {items.map((item) => (
          <Button
            key={item.label}
            size="row"
            variant={item.danger ? 'danger' : 'ghost'}
            disabled={item.disabled}
            className={item.danger ? '' : 'text-gray-700'}
            onClick={choose(item)}
          >
            <Glyph item={item} size={17} />
            {item.label}
          </Button>
        ))}
      </div>
    </Sheet>
  );
}

function Glyph({ item, size }: { item: MenuItem; size: number }) {
  if (item.icon) return <item.icon size={size} strokeWidth={2} />;
  return (
    <span className="text-center leading-none" style={{ width: size, fontSize: size }}>
      {item.glyph}
    </span>
  );
}

// Right-aligned under its trigger, repositioned on scroll and resize so it
// can't drift away from the button it belongs to.
function AnchoredMenu({
  open,
  onClose,
  anchorRef,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEscape(open, onClose);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef]);

  if (!open || !pos) return null;

  return createPortal(
    <>
      {/* Catches the next click anywhere. Transparent — nothing to dim. */}
      <div className="fixed inset-0 z-[88]" onClick={onClose} />
      <div
        role="menu"
        style={{ top: pos.top, right: pos.right }}
        className="fixed z-[90] min-w-[11rem] rounded-xl bg-white p-1 shadow-xl ring-1 ring-gray-900/[0.08] origin-top-right animate-fade-up"
      >
        {children}
      </div>
    </>,
    document.body
  );
}

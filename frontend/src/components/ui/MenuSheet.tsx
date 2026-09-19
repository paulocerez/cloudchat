import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sheet, useEscape, useIsCompact } from './Sheet';
import { Button } from './Button';
import { cn } from '~/lib/utils';

export interface MenuItem {
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
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
  align = 'end',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  items: MenuItem[];
  /** Off for rows that report progress in place, like "Generating…". */
  closeOnSelect?: boolean;
  /** Anchor for the desktop dropdown. Without it, desktop gets the dialog. */
  anchorRef?: React.RefObject<HTMLElement | null>;
  /** Which edge of the anchor the dropdown lines up with. */
  align?: 'start' | 'end';
}) {
  const compact = useIsCompact();

  const choose = (item: MenuItem) => () => {
    if (closeOnSelect) onClose();
    item.onSelect();
  };

  if (anchorRef && !compact) {
    return (
      <AnchoredMenu open={open} onClose={onClose} anchorRef={anchorRef} align={align}>
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={choose(item)}
            className={cn(
              'w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm font-medium text-left transition-colors disabled:opacity-50',
              item.danger ? 'text-danger hover:bg-danger-wash' : 'text-ink hover:bg-hover'
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
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-faint truncate">
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
            className={item.danger ? '' : 'text-ink'}
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
  return item.icon ? <item.icon size={size} strokeWidth={2} /> : null;
}

// Right-aligned under its trigger, repositioned on scroll and resize so it
// can't drift away from the button it belongs to.
function AnchoredMenu({
  open,
  onClose,
  anchorRef,
  align,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  align: 'start' | 'end';
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<React.CSSProperties | null>(null);

  useEscape(open, onClose);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      setPos(
        align === 'start'
          ? { top: r.bottom + 6, left: Math.max(8, r.left) }
          : { top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) }
      );
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef, align]);

  if (!open || !pos) return null;

  return createPortal(
    <>
      {/* Catches the next click anywhere. Transparent — nothing to dim. */}
      <div className="fixed inset-0 z-[88]" onClick={onClose} />
      <div
        role="menu"
        style={pos}
        className="fixed z-[90] min-w-[11rem] rounded-2xl bg-surface-2 p-1 shadow-2xl ring-1 ring-line animate-fade-up"
      >
        {children}
      </div>
    </>,
    document.body
  );
}

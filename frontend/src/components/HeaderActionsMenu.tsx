import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from './ui/Button';
import { MenuSheet, type MenuItem } from './ui/MenuSheet';
import { ThemeToggle } from './ThemeToggle';

/**
 * The page header's overflow, below `lg` only.
 *
 * A phone header has room for the title and about one glyph. Everything the
 * page hangs off the right edge — and the theme, which has nowhere else to go
 * once `Nav` is gone at this width — collapses in here instead of wrapping
 * onto a second row.
 *
 * The theme rides in `footer` rather than as three rows: it's a control, not a
 * choice you make once and dismiss, and the sheet should stay open while you
 * flick between light and dark to see which you want.
 */
export function HeaderActionsMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="bare"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        title="More actions"
        aria-label="More actions"
      >
        <MoreHorizontal size={18} strokeWidth={2.25} />
      </Button>

      {open && (
        <MenuSheet
          open
          onClose={() => setOpen(false)}
          items={items}
          footer={
            <div className="flex items-center justify-between gap-3 h-12 px-3">
              <span className="text-[15px] font-medium text-ink">Theme</span>
              <ThemeToggle size="sm" />
            </div>
          }
        />
      )}
    </>
  );
}

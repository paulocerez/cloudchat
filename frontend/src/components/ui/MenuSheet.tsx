import { Sheet } from './Sheet';
import { Button } from './Button';

export interface MenuItem {
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  glyph?: React.ReactNode;
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/**
 * The menu behind any "…". Deliberately a plain list of full-width rows — the
 * only shape that's comfortable to hit with a thumb, and the same one the
 * long-press menus on timeline items use.
 */
export function MenuSheet({
  open,
  onClose,
  title,
  items,
  closeOnSelect = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  items: MenuItem[];
  /** Off for rows that report progress in place, like "Generating…". */
  closeOnSelect?: boolean;
}) {
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
            onClick={() => {
              if (closeOnSelect) onClose();
              item.onSelect();
            }}
          >
            {item.icon ? (
              <item.icon size={17} strokeWidth={2} />
            ) : (
              <span className="w-[17px] text-center text-[17px] leading-none">{item.glyph}</span>
            )}
            {item.label}
          </Button>
        ))}
      </div>
    </Sheet>
  );
}

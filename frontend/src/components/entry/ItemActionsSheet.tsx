import { Sheet } from '~/components/ui/Sheet';
import { Button } from '~/components/ui/Button';

export interface ItemAction {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

// The menu a long press opens on a timeline item. Deliberately a plain list of
// full-width rows — the only shape that's comfortable to hit with a thumb.
export function ItemActionsSheet({
  open,
  onClose,
  title,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: ItemAction[];
}) {
  return (
    <Sheet open={open} onClose={onClose} className="max-w-sm" variant="bottom">
      {title && (
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-gray-400 truncate">
          {title}
        </p>
      )}
      <div className="flex flex-col">
        {actions.map((action) => (
          <Button
            key={action.label}
            size="row"
            variant={action.danger ? 'danger' : 'ghost'}
            className={action.danger ? '' : 'text-gray-700'}
            onClick={() => {
              onClose();
              action.onSelect();
            }}
          >
            <action.icon size={17} strokeWidth={2} />
            {action.label}
          </Button>
        ))}
      </div>
    </Sheet>
  );
}

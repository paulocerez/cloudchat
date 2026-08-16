import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Glass modal primitive: translucent scrim + a surface that materializes
// (scale + blur) rather than a flat fade. Portaled to escape transformed
// ancestors, closes on Escape or scrim click.
export function Modal({
  open,
  onClose,
  children,
  className = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      className="glass-scrim fixed inset-0 z-[90] flex items-center justify-center bg-black/25 backdrop-blur-md p-4 animate-scrim"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`glass-surface w-full ${className} rounded-2xl bg-white/85 backdrop-blur-xl shadow-2xl ring-1 ring-black/[0.06] p-5 animate-materialize`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

// Shared modal header: title + close button.
export function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-gray-900 tracking-[-0.01em]">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-500/10 active:scale-90 transition-all"
      >
        <X size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, Camera, Plus } from 'lucide-react';
import { api } from '~/lib/api';
import { Button } from '~/components/ui/Button';

/**
 * Pinned to the bottom edge, inside the safe area. Capture is what you do most
 * often on a phone, so it's the one control always in reach — and it takes a
 * photo now, which was the obvious missing thing: the camera roll is the first
 * place anything worth journalling ends up.
 */
export function Composer({
  date,
  onAdd,
  onPickPhoto,
}: {
  date: string;
  onAdd: () => void;
  onPickPhoto: () => void;
}) {
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.entries.addMessage(date, content.trim()),
    onSuccess: () => {
      setContent('');
      qc.invalidateQueries({ queryKey: ['entry', date] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
  });

  const canSend = content.trim().length > 0 && !isPending;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-900/[0.07] bg-white/90 backdrop-blur-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) mutate();
        }}
        className="max-w-2xl mx-auto flex items-center gap-2 px-4 sm:px-6 md:px-8 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]"
      >
        <Button variant="icon" size="icon" onClick={onPickPhoto} aria-label="Add a photo">
          <Camera size={18} strokeWidth={2} />
        </Button>
        <Button variant="icon" size="icon" onClick={onAdd} aria-label="Add to this day">
          <Plus size={19} strokeWidth={2.25} />
        </Button>

        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note…"
          enterKeyHint="send"
          // 16px keeps iOS Safari from zooming the viewport on focus.
          className="flex-1 min-w-0 h-10 text-base sm:text-sm text-[#241F2E] rounded-full surface-solid px-4 placeholder:text-[#94949E] focus:outline-none focus:ring-2 focus:ring-[#241F2E]/70 transition-shadow"
        />

        <Button
          type="submit"
          variant="primary"
          size="icon"
          disabled={!canSend}
          aria-label="Add note"
          className={`rounded-full transition-all duration-200 ${
            canSend ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
          }`}
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </Button>
      </form>
    </div>
  );
}

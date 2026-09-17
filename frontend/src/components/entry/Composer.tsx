import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, Plus } from 'lucide-react';
import { api } from '~/lib/api';
import { Button } from '~/components/ui/Button';

/**
 * Pinned to the bottom edge, inside the safe area. Capture is the thing you do
 * most often on a phone, so it stops being an input buried under an hour of
 * Pocket transcripts and becomes the one control that's always in reach.
 */
export function Composer({ date, onAdd }: { date: string; onAdd: () => void }) {
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
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-900/[0.06] bg-white/80 backdrop-blur-xl backdrop-saturate-150 glass-surface">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) mutate();
        }}
        className="max-w-2xl mx-auto flex items-center gap-2 px-4 sm:px-6 md:px-8 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
      >
        <Button variant="bare" size="icon" onClick={onAdd} aria-label="Add to this day">
          <Plus size={20} strokeWidth={2.25} />
        </Button>

        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note…"
          enterKeyHint="send"
          // 16px keeps iOS Safari from zooming the viewport on focus.
          className="flex-1 min-w-0 h-10 text-base sm:text-sm text-gray-800 rounded-full bg-gray-100 px-4 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/80 focus:bg-white transition-colors"
        />

        <Button
          type="submit"
          variant="primary"
          size="icon"
          disabled={!canSend}
          aria-label="Add note"
          className={`rounded-full transition-opacity ${canSend ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </Button>
      </form>
    </div>
  );
}

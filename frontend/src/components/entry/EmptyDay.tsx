import { MessageSquare } from 'lucide-react';

// Shared by both views. Points at the composer, which is now the bar pinned to
// the bottom of the screen rather than an input buried in the page.
export function EmptyDay() {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center animate-fade-up">
      <MessageSquare size={28} strokeWidth={1.5} className="text-faintest" />
      <p className="text-sm text-faint">Nothing captured for this day</p>
      <p className="text-xs text-faintest">Add a note below, or send yourself a WhatsApp message</p>
    </div>
  );
}

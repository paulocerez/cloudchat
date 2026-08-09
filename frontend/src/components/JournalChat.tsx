import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '~/lib/api';
import { MessageCircle, X, Send } from 'lucide-react';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export default function JournalChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (question: string) => api.chat.ask(question, messages.slice(-10)),
    onSuccess: (res) =>
      setMessages((m) => [...m, { role: 'assistant', content: res.answer }]),
    onError: () =>
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: "Sorry, something went wrong. Please try again." },
      ]),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isPending]);

  const send = () => {
    const q = input.trim();
    if (!q || isPending) return;
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput('');
    mutate(q);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none">
      {open && (
        <div className="pointer-events-auto mb-3 w-[calc(100vw-2rem)] max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-fade-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <MessageCircle size={15} strokeWidth={2.5} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">Ask your journal</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 max-h-[50vh] overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 leading-relaxed">
                Ask about your past days — e.g. "When did I last see Anita?" or "What did I do
                in Potsdam?"
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-gray-900 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-700 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-400 rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-100">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask a question…"
              className="flex-1 text-sm text-gray-700 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || isPending}
              aria-label="Send"
              className="shrink-0 p-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <Send size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto inline-flex items-center gap-2 px-4 py-3 rounded-full bg-gray-900 text-white text-sm font-medium shadow-xl hover:bg-gray-800 hover:-translate-y-0.5 transition-all"
        >
          <MessageCircle size={16} strokeWidth={2.5} />
          Ask your journal
        </button>
      )}
    </div>
  );
}

import React, { useCallback, useMemo, useState } from 'react';
import { CalendarDays, Gift, Heart, Send, Settings, Sparkles, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { TheaAvatar } from '@/components/unwrapt2/TheaAvatar';
import { useAuth } from '@/components/auth/AuthProvider';
import { trackProductEvent } from '@/lib/productAnalytics';
import { TheaContextValue, type TheaContext } from '@/hooks/useThea';
import { supabase } from '@/integrations/supabase/client';

// Testing-only allowlist for the LLM-backed conversation. Everyone else keeps
// the lightweight keyword-routed version below untouched.
const THEA_LLM_ALLOWED_EMAILS = ['kkinyua53@gmail.com', 'giraudelc@gmail.com'];

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type ThreadProduct = { id: string; title: string; price: number; featured_image_url: string | null };

const suggestions = [
  { label: 'Plan for someone', detail: 'Add or update a person', icon: Users, destination: '/?action=add-person', intent: 'person' },
  { label: 'Find a gift', detail: 'Browse ideas and interests', icon: Gift, destination: '/?action=catalog', intent: 'catalog' },
  { label: 'Check a delivery', detail: 'See orders and next steps', icon: CalendarDays, destination: '/gift-history', intent: 'status' },
  { label: 'Set my preferences', detail: 'Budget and approvals', icon: Settings, destination: '/settings', intent: 'settings' },
] as const;

const inferSuggestion = (question: string) => {
  const value = question.toLowerCase();
  if (/deliver|ship|track|order|status/.test(value)) return suggestions[2];
  if (/budget|spend|approv|preference|setting/.test(value)) return suggestions[3];
  if (/person|recipient|birthday|anniversary|interest/.test(value)) return suggestions[0];
  return suggestions[1];
};

export const TheaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<TheaContext>({});
  const [question, setQuestion] = useState('');
  const [matchedIntent, setMatchedIntent] = useState<(typeof suggestions)[number] | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatProducts, setChatProducts] = useState<ThreadProduct[]>([]);
  const [sending, setSending] = useState(false);

  const isTheaLlmTester = Boolean(user?.email && THEA_LLM_ALLOWED_EMAILS.includes(user.email.toLowerCase()));

  const openThea = useCallback((nextContext: TheaContext = {}) => {
    setContext(nextContext);
    setQuestion('');
    setMatchedIntent(null);
    setChatMessages([]);
    setChatProducts([]);
    setOpen(true);
    void trackProductEvent('thea_opened', { surface: nextContext.surface || 'global', has_recipient_context: Boolean(nextContext.recipientName) });
  }, []);

  const go = (destination: string, intent: string) => {
    setOpen(false);
    void trackProductEvent('thea_action_selected', { intent, surface: context.surface || 'global' });
    navigate(destination);
  };

  const submitQuestion = (event: React.FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    const match = inferSuggestion(question);
    setMatchedIntent(match);
    void trackProductEvent('thea_request_routed', { intent: match.intent, surface: context.surface || 'global' });
  };

  const sendToThea = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || sending) return;

    const nextMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(nextMessages);
    setQuestion('');
    setSending(true);
    void trackProductEvent('thea_llm_message_sent', { surface: context.surface || 'global' });

    try {
      const { data, error } = await supabase.functions.invoke('thea-chat', { body: { messages: nextMessages } });
      if (error || !data?.success) throw error || new Error(data?.error || 'Thea request failed');
      setChatMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
      setChatProducts(data.products || []);
    } catch (err) {
      console.error('Thea chat failed', err);
      setChatMessages([...nextMessages, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Give it another try in a moment.",
      }]);
    } finally {
      setSending(false);
    }
  };

  const value = useMemo(() => ({ openThea }), [openThea]);
  const showDock = ['/settings', '/analytics', '/notifications', '/gift-history', '/history', '/wishlist'].includes(location.pathname);
  const contextualIntro = context.recipientName
    ? `I can help you plan for ${context.recipientName.split(' ')[0]}, refine their interests, or find the next gift.`
    : context.surface === 'catalog'
      ? 'Tell me who you are shopping for or what should feel different about the gift.'
      : 'I can help you remember the moment, choose thoughtfully, and keep delivery on track.';

  return (
    <TheaContextValue.Provider value={value}>
      {children}
      {user && showDock && (
        <button
          type="button"
          onClick={() => openThea({ surface: location.pathname === '/settings' ? 'settings' : location.pathname === '/gift-history' ? 'gift_status' : 'dashboard' })}
          className="u-thea-dock fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-[#2A2520] pl-2 pr-4 text-[13px] font-semibold text-[#F4ECDD] shadow-[0_12px_34px_rgba(42,37,32,0.24)]"
          style={location.pathname === '/settings' ? { bottom: 'calc(env(safe-area-inset-bottom) + 5.75rem)' } : undefined}
          aria-label="Ask Thea"
        >
          <TheaAvatar size={34} /><span>Ask Thea</span>
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-h-[88dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] border-x border-t border-[#DED2C1] bg-[#F7F1E6] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#2A2520]/15" />
          <SheetHeader className="text-left">
            <div className="flex items-center gap-3"><TheaAvatar size={48} /><div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B65B3C]">Your gifting agent</div><SheetTitle className="font-display text-[28px] font-normal text-[#2A2520]">Ask Thea</SheetTitle></div></div>
            <SheetDescription className="pt-1 text-[13.5px] leading-6 text-[#6F6559]">{contextualIntro}</SheetDescription>
          </SheetHeader>

          {isTheaLlmTester && chatMessages.length > 0 && (
            <div className="mt-5 max-h-[38dvh] space-y-3 overflow-y-auto pr-1">
              {chatMessages.map((message, index) => (
                message.role === 'user' ? (
                  <div key={index} className="flex justify-end">
                    <div className="max-w-[85%] rounded-[16px] rounded-tr-[4px] bg-[#2A2520] px-3.5 py-2.5 text-[13.5px] leading-5 text-[#F4ECDD]">{message.content}</div>
                  </div>
                ) : (
                  <div key={index} className="flex items-start gap-2">
                    <TheaAvatar size={24} />
                    <div className="max-w-[85%] rounded-[16px] rounded-tl-[4px] border border-[#D9CDBD] bg-white px-3.5 py-2.5 text-[13.5px] leading-5 text-[#2A2520]">{message.content}</div>
                  </div>
                )
              ))}
              {sending && (
                <div className="flex items-start gap-2">
                  <TheaAvatar size={24} />
                  <div className="rounded-[16px] rounded-tl-[4px] border border-[#D9CDBD] bg-white px-3.5 py-2.5 text-[13.5px] text-[#9A8E7C]">Thinking…</div>
                </div>
              )}
            </div>
          )}

          {isTheaLlmTester && chatProducts.length > 0 && (
            <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
              {chatProducts.map((product) => (
                <div key={product.id} className="w-32 shrink-0 rounded-[16px] border border-[#DED2C1] bg-white p-2.5">
                  {product.featured_image_url && (
                    <img src={product.featured_image_url} alt={product.title} className="mb-2 h-20 w-full rounded-[10px] object-cover" />
                  )}
                  <p className="line-clamp-2 text-[11.5px] font-semibold leading-4 text-[#2A2520]">{product.title}</p>
                  <p className="mt-1 text-[11.5px] font-semibold text-[#B65B3C]">${product.price}</p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={isTheaLlmTester ? sendToThea : submitQuestion} className="mt-5 rounded-[20px] border border-[#D9CDBD] bg-white p-2 shadow-[0_8px_24px_rgba(42,37,32,0.04)]">
            <label htmlFor="thea-question" className="sr-only">Tell Thea what you need</label>
            <div className="flex items-center gap-2">
              <input id="thea-question" value={question} onChange={(event) => { setQuestion(event.target.value); setMatchedIntent(null); }} placeholder="Tell Thea what you need…" disabled={sending} className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[14px] text-[#2A2520] outline-none placeholder:text-[#9A8E7C] disabled:opacity-60" />
              <button type="submit" disabled={!question.trim() || sending} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#B65B3C] text-white disabled:opacity-35" aria-label="Send to Thea"><Send className="h-4 w-4" /></button>
            </div>
          </form>

          {!isTheaLlmTester && matchedIntent && (
            <div aria-live="polite" className="mt-3 rounded-[18px] border border-[#D9CDBD] bg-[#FFFDF8] p-4">
              <div className="flex items-start gap-3"><TheaAvatar size={28} /><div className="flex-1"><p className="text-[13px] leading-5 text-[#5A5147]">The best next step is <strong>{matchedIntent.label.toLowerCase()}</strong>. I’ll take you to the right place and keep your current work intact.</p><button onClick={() => go(matchedIntent.destination, matchedIntent.intent)} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#2A2520] px-4 py-2 text-xs font-semibold text-[#F4ECDD]">Continue <Sparkles className="h-3.5 w-3.5" /></button></div></div>
            </div>
          )}

          <div className="mt-6"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#8A7E6E]">Or start here</p><div className="grid grid-cols-2 gap-2.5">{suggestions.map((item) => { const Icon = item.icon; return <button key={item.intent} onClick={() => go(item.destination, item.intent)} className="u-touch-card rounded-[18px] border border-[#DED2C1] bg-white p-3.5 text-left"><Icon className="mb-3 h-4 w-4 text-[#B65B3C]" /><span className="block text-[13px] font-semibold text-[#2A2520]">{item.label}</span><span className="mt-1 block text-[11px] leading-4 text-[#8A7E6E]">{item.detail}</span></button>; })}</div></div>
          <div className="mt-5 flex items-center gap-2 rounded-[15px] bg-[#EEE5D5] px-3 py-2.5 text-[11px] leading-4 text-[#6F6559]"><Heart className="h-3.5 w-3.5 shrink-0 text-[#B65B3C]" />Thea never purchases a gift without the approval level you set.</div>
        </SheetContent>
      </Sheet>
    </TheaContextValue.Provider>
  );
};

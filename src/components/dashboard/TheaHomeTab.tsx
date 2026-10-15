import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TheaAvatar } from '@/components/unwrapt2/TheaAvatar';
import { TheaCharacter } from '@/components/unwrapt2/TheaCharacter';
import { U } from '@/components/unwrapt2/theme';
import {
  buildBriefingMessage,
  briefingQuickChips,
  buildDashboardBriefing,
  type BriefingItem,
} from '@/lib/dashboardBriefing';
import type { RecipientRecord } from '@/lib/giftStatus';
import { trackProductEvent } from '@/lib/productAnalytics';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const TYPEWRITER_BASE_MS = 28;
const TYPEWRITER_MAX_DURATION_MS = 4000;

const TypewriterText: React.FC<{ text: string }> = ({ text }) => {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!text) {
      setShown(0);
      return;
    }
    setShown(0);
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    const stepChars = Math.max(1, Math.ceil((text.length * TYPEWRITER_BASE_MS) / TYPEWRITER_MAX_DURATION_MS));
    let index = 0;
    const tick = () => {
      if (cancelled) return;
      index = Math.min(text.length, index + stepChars);
      setShown(index);
      if (index >= text.length) return;
      timeoutId = setTimeout(tick, TYPEWRITER_BASE_MS);
    };
    timeoutId = setTimeout(tick, TYPEWRITER_BASE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [text]);

  return (
    <span className="whitespace-pre-wrap">
      {text.slice(0, shown)}
      {shown < text.length ? <span style={{ opacity: 0.35 }}>|</span> : null}
    </span>
  );
};

interface TheaHomeTabProps {
  displayName: string;
  recipients: RecipientRecord[];
  onOpenRecipient: (recipientId: string, intent?: BriefingItem['action']) => void;
  onSwitchToManual: () => void;
}

const TheaHomeTab: React.FC<TheaHomeTabProps> = ({
  displayName,
  recipients,
  onOpenRecipient,
  onSwitchToManual,
}) => {
  const briefing = useMemo(() => buildDashboardBriefing(recipients), [recipients]);
  const seed = useMemo(() => buildBriefingMessage(displayName, briefing), [displayName, briefing]);
  const chips = useMemo(() => briefingQuickChips(briefing), [briefing]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const seededFor = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Seed briefing once for this recipient set. Do not wipe an active conversation.
  useEffect(() => {
    const fingerprint = `${displayName}|${[...recipients].map((r) => r.id).sort().join(',')}`;
    if (seededFor.current === fingerprint) return;
    if (seededFor.current && messages.some((m) => m.role === 'user')) return;
    seededFor.current = fingerprint;
    setMessages([{ role: 'assistant', content: seed }]);
    void trackProductEvent('dashboard_thea_briefing_shown', {
      upcoming: briefing.upcoming.length,
      needs_info: briefing.needsInfo.length,
      in_motion: briefing.inMotion.length,
      recent: briefing.recentlyDelivered.length,
    });
  }, [displayName, recipients, seed, briefing, messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    void trackProductEvent('dashboard_thea_message_sent', {
      turn: nextMessages.filter((m) => m.role === 'user').length,
    });

    try {
      const { data, error } = await supabase.functions.invoke('thea-chat', {
        body: {
          messages: nextMessages,
          mode: 'dashboard',
          briefing: {
            upcoming: briefing.upcoming,
            needsInfo: briefing.needsInfo,
            inMotion: briefing.inMotion,
            recentlyDelivered: briefing.recentlyDelivered,
          },
        },
      });
      if (error || !data?.success || typeof data.reply !== 'string') {
        throw error || new Error(data?.error || 'Thea request failed');
      }
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: data.reply.replace(/\s*[\u2014\u2013]\s*/g, ', ').trim() },
      ]);
    } catch (err) {
      console.error('Dashboard Thea chat failed', err);
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: "I'm having trouble connecting right now. Give it another try in a moment.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleChip = (item: BriefingItem) => {
    if (item.action === 'address' || item.action === 'interests' || item.action === 'open' || item.action === 'payment' || item.action === 'review') {
      onOpenRecipient(item.recipientId, item.action);
      if (item.action === 'address' || item.action === 'interests') {
        onSwitchToManual();
      }
      return;
    }
    void send(item.label);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b px-1 pb-3" style={{ borderColor: 'rgba(42,37,32,0.08)' }}>
        <TheaCharacter size="compact" activity="chat" gesture="Listen" className="u-thea-character--chat" />
        <div className="min-w-0 text-left">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: U.accent }}>
            Your gifting agent
          </div>
          <div className="font-display text-[22px] leading-tight" style={{ color: U.ink }}>
            Thea
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4 pr-1">
        {messages.map((message, index) =>
          message.role === 'user' ? (
            <div key={index} className="flex justify-end">
              <div
                className="max-w-[85%] rounded-[18px] rounded-tr-[6px] px-3.5 py-2.5 text-[14px] leading-5"
                style={{ background: U.ink, color: U.buttonText }}
              >
                {message.content}
              </div>
            </div>
          ) : (
            <div key={index} className="flex items-start gap-2">
              <TheaAvatar size={26} />
              <div
                className="max-w-[88%] rounded-[18px] rounded-tl-[6px] border px-3.5 py-2.5 text-[14px] leading-5"
                style={{ background: U.surface, borderColor: U.border, color: U.ink }}
              >
                {index === messages.length - 1 && !sending ? (
                  <TypewriterText text={message.content} />
                ) : (
                  <span className="whitespace-pre-wrap">{message.content}</span>
                )}
              </div>
            </div>
          ),
        )}
        {sending && (
          <div className="flex items-start gap-2">
            <TheaAvatar size={26} />
            <div
              className="rounded-[18px] rounded-tl-[6px] border px-3.5 py-2.5 text-[13.5px]"
              style={{ background: U.surface, borderColor: U.border, color: U.subtle }}
            >
              Thinking…
            </div>
          </div>
        )}
      </div>

      {chips.length > 0 && messages.length <= 2 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={`${chip.recipientId}-${chip.label}`}
              type="button"
              onClick={() => handleChip(chip)}
              className="rounded-full border px-3 py-2 text-left text-[12.5px] font-medium"
              style={{ background: U.chip, borderColor: 'rgba(42,37,32,0.1)', color: '#5A5147' }}
            >
              {chip.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onSwitchToManual}
            className="rounded-full border px-3 py-2 text-[12.5px] font-medium"
            style={{ background: U.surface, borderColor: U.border, color: U.muted }}
          >
            Open calendar
          </button>
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="shrink-0 rounded-[22px] border p-2"
        style={{ background: U.surface, borderColor: U.border }}
      >
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask Thea about gifts, people, or what's next…"
            disabled={sending}
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[14px] outline-none disabled:opacity-60"
            style={{ color: U.ink }}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-35"
            style={{ background: U.accent, color: '#fff' }}
            aria-label="Send to Thea"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default TheaHomeTab;

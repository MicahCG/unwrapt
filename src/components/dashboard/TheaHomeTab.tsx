import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TheaAvatar } from '@/components/unwrapt2/TheaAvatar';
import { TheaCharacter } from '@/components/unwrapt2/TheaCharacter';
import { U } from '@/components/unwrapt2/theme';
import {
  ChatUiModules,
  ProductCards,
  ReviewCard,
  type ChatProduct,
  type ChatUiFocus,
  type ChatUiModule,
  type GiftReview,
  type ReviewState,
} from '@/components/dashboard/TheaChatCards';
import {
  buildBriefingMessage,
  briefingQuickChips,
  buildDashboardBriefing,
  type BriefingItem,
} from '@/lib/dashboardBriefing';
import type { RecipientRecord } from '@/lib/giftStatus';
import { trackProductEvent } from '@/lib/productAnalytics';
import { useTheaReaction } from '@/hooks/useTheaReaction';
import { useCalendarConnected } from '@/hooks/useCalendarConnection';
import { startCalendarConnect } from '@/lib/calendarConnection';
import { cleanTheaText, renderTheaText } from '@/lib/theaText';
import { theaChatPose } from '@/lib/theaState';
import { ensureCalendarConnectUi } from '@/lib/theaChatUi';
import type { TheaPose } from '@/components/unwrapt2/TheaFigure';
import {
  buildGiftResumeMessage,
  consumePendingGiftResume,
  type PendingGiftResume,
} from '@/lib/postSubscribeResume';

type WriteResult = { tool: string; ok: boolean; recordId?: string; error?: string };

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  products?: ChatProduct[];
  review?: GiftReview | null;
  /** Interactive modules from present_ui (calendar connect, add/edit recipient). */
  ui?: ChatUiModule[];
  /** A write Thea attempted this turn that did not save. */
  unsaved?: boolean;
  /** A user message that never reached Thea. */
  failed?: boolean;
};

type HistoryState = 'loading' | 'ready' | 'error';

const TYPEWRITER_BASE_MS = 28;
const TYPEWRITER_MAX_DURATION_MS = 4000;
const MAX_SENT_MESSAGES = 40;
const SUCCESS_POSE_MS = 3500;

const reviewKey = (review: GiftReview) => `${review.recipientId}:${review.productId}:${review.occasionDate}`;

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
    <span>
      {renderTheaText(text.slice(0, shown))}
      {shown < text.length ? <span style={{ opacity: 0.35 }}>|</span> : null}
    </span>
  );
};

interface TheaHomeTabProps {
  displayName: string;
  recipients: RecipientRecord[];
  autopilotThreshold?: number;
  onOpenRecipient: (recipientId: string, intent?: BriefingItem['action']) => void;
  onAddRecipient: () => void;
  onEditRecipient: (recipientId: string, focus?: ChatUiFocus) => void;
  onSwitchToManual: () => void;
  /** A message another screen asks Thea to handle (e.g. a gift chosen in the catalog). */
  queuedMessage?: { id: number; text: string } | null;
  /** False until the recipients query has loaded, so the greeting isn't written for an empty list. */
  recipientsLoaded?: boolean;
  /** Lets the dashboard hide the Thea/Manual tab bar and pin to the visual viewport while typing. */
  onComposerFocusChange?: (focused: boolean) => void;
}

const STATUS_LINE: Partial<Record<TheaPose, string>> = {
  thinking: 'Working on it…',
  gift: 'Gift scheduled',
  oops: 'Something didn’t go through',
  listening: 'Listening…',
};

const TheaHomeTab: React.FC<TheaHomeTabProps> = ({
  displayName,
  recipients,
  autopilotThreshold,
  onOpenRecipient,
  onAddRecipient,
  onEditRecipient,
  onSwitchToManual,
  queuedMessage,
  recipientsLoaded = true,
  onComposerFocusChange,
}) => {
  const queryClient = useQueryClient();
  const briefing = useMemo(() => buildDashboardBriefing(recipients, autopilotThreshold), [recipients, autopilotThreshold]);
  const seed = useMemo(() => buildBriefingMessage(displayName, briefing), [displayName, briefing]);
  const chips = useMemo(() => briefingQuickChips(briefing), [briefing]);
  const { data: calendarConnected = true } = useCalendarConnected();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryState>('loading');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [reviewStates, setReviewStates] = useState<Record<string, ReviewState>>({});
  const [celebrating, setCelebrating] = useState(false);
  const { reaction, reactTo } = useTheaReaction();
  const seeded = useRef(false);
  const giftResumeApplied = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  /** Stay glued to the newest message unless the user scrolls up to read history. */
  const stickToBottomRef = useRef(true);
  const celebrateTimer = useRef<number>();
  const blurTimer = useRef<number>();
  const [listPadBottom, setListPadBottom] = useState(20);

  const setFocused = useCallback((focused: boolean) => {
    setComposerFocused(focused);
    onComposerFocusChange?.(focused);
  }, [onComposerFocusChange]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => () => {
    window.clearTimeout(blurTimer.current);
    onComposerFocusChange?.(false);
  }, [onComposerFocusChange]);

  // Track near-bottom; re-pin when content grows (typewriter) or the list shrinks (keyboard).
  useEffect(() => {
    const scrollEl = scrollRef.current;
    const contentEl = chatContentRef.current;
    if (!scrollEl || !contentEl) return;

    const NEAR_BOTTOM_PX = 80;
    const handleScroll = () => {
      stickToBottomRef.current =
        scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < NEAR_BOTTOM_PX;
    };
    scrollEl.addEventListener('scroll', handleScroll, { passive: true });

    const pinIfSticky = () => {
      if (stickToBottomRef.current) scrollEl.scrollTop = scrollEl.scrollHeight;
    };
    const observer = new ResizeObserver(pinIfSticky);
    observer.observe(contentEl);
    observer.observe(scrollEl);

    return () => {
      scrollEl.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  // Clearance under the last bubble so it doesn't sit flush against the composer rim.
  // Composer is a flex sibling (not an overlay); pad is breathing room, not a keyboard spacer —
  // visualViewport pinning in Dashboard already shrinks the shell above the keyboard.
  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    const syncPad = () => {
      const next = Math.max(28, Math.round(composer.getBoundingClientRect().height * 0.45));
      setListPadBottom(next);
    };
    syncPad();
    const ro = new ResizeObserver(syncPad);
    ro.observe(composer);
    return () => ro.disconnect();
  }, []);

  // Composer focus / keyboard open: always jump to the latest message.
  useEffect(() => {
    if (!composerFocused) return;
    stickToBottomRef.current = true;
    const pin = () => {
      if (stickToBottomRef.current) scrollToBottom('auto');
    };
    pin();
    const raf = requestAnimationFrame(pin);
    // iOS keyboard + chrome collapse settle over a couple frames.
    const t1 = window.setTimeout(pin, 50);
    const t2 = window.setTimeout(pin, 280);

    const vv = window.visualViewport;
    const onViewport = () => pin();
    vv?.addEventListener('resize', onViewport);
    vv?.addEventListener('scroll', onViewport);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      vv?.removeEventListener('resize', onViewport);
      vv?.removeEventListener('scroll', onViewport);
    };
  }, [composerFocused, scrollToBottom]);

  const giftResumeMessage = (resume: PendingGiftResume): ChatMessage => ({
    role: 'assistant',
    content: buildGiftResumeMessage(resume),
    products: resume.products,
  });

  // Resume the saved conversation for this account; a new one starts from the briefing.
  const loadHistory = useCallback(async () => {
    setHistory('loading');
    try {
      const { data, error } = await supabase.functions.invoke('thea-chat', { body: { action: 'history', mode: 'dashboard' } });
      if (error || !data?.success) throw error || new Error(data?.error || 'History unavailable');
      const restored = ((data.messages || []) as { role: ChatMessage['role']; content: string }[])
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m) => ({ role: m.role, content: m.role === 'assistant' ? cleanTheaText(m.content) : m.content }));
      setMessages((current) => (current.some((m) => m.role === 'user') ? current : restored));
      setHistory('ready');
    } catch (err) {
      console.error('Thea history failed to load', err);
      setHistory('error');
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Prefer pre-subscribe gift options over the generic status briefing after VIP checkout.
  useEffect(() => {
    if (history === 'loading' || !recipientsLoaded || giftResumeApplied.current) return;

    const wantsResume =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('resume') === 'gifts';

    const pending = consumePendingGiftResume();
    if (!pending?.products?.length) {
      // Still clear the resume query so a later briefing seed can run normally.
      if (wantsResume) {
        const url = new URL(window.location.href);
        url.searchParams.delete('resume');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
      return;
    }

    giftResumeApplied.current = true;
    seeded.current = true;
    setMessages((current) => {
      const alreadyHasProducts = current.some((m) => (m.products?.length || 0) > 0);
      if (alreadyHasProducts) return current;
      // Drop a lone status briefing so the gift reveal is the first thing they see.
      const withoutBriefing =
        current.length === 1 && current[0].role === 'assistant' && !current[0].products
          ? []
          : current;
      return [...withoutBriefing, giftResumeMessage(pending)];
    });
    void trackProductEvent('dashboard_thea_gift_resume_shown', {
      recipient: pending.recipientName,
      product_count: pending.products.length,
      from_query: wantsResume,
    });
    if (wantsResume) {
      const url = new URL(window.location.href);
      url.searchParams.delete('resume');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [history, recipientsLoaded, messages.length]);

  // With no saved conversation (and no gift resume), open with the briefing once.
  // Adding or editing a person later must not replay the greeting.
  useEffect(() => {
    if (history === 'loading' || !recipientsLoaded || seeded.current) return;
    seeded.current = true;
    if (messages.length) return;
    setMessages([{ role: 'assistant', content: seed }]);
    void trackProductEvent('dashboard_thea_briefing_shown', {
      upcoming: briefing.upcoming.length,
      needs_info: briefing.needsInfo.length,
      in_motion: briefing.inMotion.length,
      recent: briefing.recentlyDelivered.length,
    });
  }, [history, recipientsLoaded, seed, briefing, messages.length]);

  // New turns / typing indicator: stay pinned only when already near the bottom (or forced by send/focus).
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    scrollToBottom('smooth');
  }, [messages, sending, scrollToBottom]);

  useEffect(() => () => window.clearTimeout(celebrateTimer.current), []);

  const celebrate = () => {
    setCelebrating(true);
    window.clearTimeout(celebrateTimer.current);
    celebrateTimer.current = window.setTimeout(() => setCelebrating(false), SUCCESS_POSE_MS);
  };

  /** Sends one user turn. Resolves with the write results, or null if Thea never answered. */
  const send = async (text: string, base: ChatMessage[] = messages): Promise<WriteResult[] | null> => {
    const trimmed = text.trim();
    if (!trimmed || sending) return null;
    stickToBottomRef.current = true;
    const nextMessages: ChatMessage[] = [...base, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    reactTo(trimmed);
    void trackProductEvent('dashboard_thea_message_sent', {
      turn: nextMessages.filter((m) => m.role === 'user').length,
    });

    try {
      const { data, error } = await supabase.functions.invoke('thea-chat', {
        body: {
          messages: nextMessages.filter((m) => !m.failed).slice(-MAX_SENT_MESSAGES).map(({ role, content }) => ({ role, content })),
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
      const writes = (data.writes || []) as WriteResult[];
      // Only a confirmed write changes what the rest of the app shows.
      if (writes.some((w) => w.ok)) {
        await queryClient.invalidateQueries({ queryKey: ['recipients'] });
      }
      if (writes.some((w) => w.ok && w.tool === 'confirm_scheduled_gift')) celebrate();
      // Client safety net: if the edge function is stale or the model refuses
      // calendar connect after a poisoned history, still surface the module.
      const ensured = ensureCalendarConnectUi(
        trimmed,
        nextMessages,
        cleanTheaText(data.reply),
        (Array.isArray(data.ui) ? data.ui : []) as ChatUiModule[],
      );
      const ui = ensured.ui;
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: ensured.reply,
          products: (data.products || []) as ChatProduct[],
          review: (data.review || null) as GiftReview | null,
          ui: ui.length ? ui : undefined,
          unsaved: writes.some((w) => !w.ok),
        },
      ]);
      // Bring up existing editors immediately so the user isn't stuck behind another tap.
      for (const mod of ui) {
        if (mod.module === 'add_recipient') onAddRecipient();
        if (mod.module === 'edit_recipient') onEditRecipient(mod.recipientId, mod.focus);
      }
      return writes;
    } catch (err) {
      console.error('Dashboard Thea chat failed', err);
      // Say plainly that it didn't go through; never invent a reply.
      setMessages(nextMessages.map((m, i) => (i === nextMessages.length - 1 ? { ...m, failed: true } : m)));
      return null;
    } finally {
      setSending(false);
    }
  };

  // Send a handed-off message once Thea is ready (history loaded, nothing in flight).
  const handledQueue = useRef<number | null>(null);
  useEffect(() => {
    if (!queuedMessage || handledQueue.current === queuedMessage.id) return;
    if (history === 'loading' || sending) return;
    handledQueue.current = queuedMessage.id;
    void send(queuedMessage.text);
    // send is recreated each render; the queue id guards against repeats.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedMessage, history, sending]);

  const retry = (index: number) => {
    const failed = messages[index];
    void send(failed.content, messages.filter((_, i) => i !== index));
  };

  const selectProduct = (product: ChatProduct) => {
    setSelectedProductId(product.id);
    void trackProductEvent('dashboard_thea_gift_selected', { product_id: product.id });
    void send(`I'd like the ${product.title} (product ${product.id}).`);
  };

  const confirmReview = async (review: GiftReview) => {
    const key = reviewKey(review);
    setReviewStates((s) => ({ ...s, [key]: 'confirming' }));
    const writes = await send(`Yes, confirm the ${review.productTitle} for ${review.recipientName}.`);
    const scheduled = writes?.some((w) => w.ok && w.tool === 'confirm_scheduled_gift');
    setReviewStates((s) => ({ ...s, [key]: scheduled ? 'scheduled' : 'pending' }));
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

  const lastMessage = messages[messages.length - 1];
  const pose = theaChatPose({
    sending,
    failed: history === 'error' || Boolean(lastMessage?.failed || lastMessage?.unsaved),
    succeeded: celebrating,
    typing: input.trim().length > 0,
    lastReply: lastMessage?.role === 'assistant' && !lastMessage.products?.length && !lastMessage.review ? lastMessage.content : null,
  });
  const latestReviewIndex = messages.reduce((latest, m, i) => (m.review ? i : latest), -1);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div
        className={`flex shrink-0 items-center border-b px-1 ${composerFocused ? 'gap-2.5 py-2' : 'gap-3 pb-3'}`}
        style={{ borderColor: 'rgba(42,37,32,0.08)' }}
      >
        {composerFocused ? (
          <TheaAvatar size={40} pose={pose} />
        ) : (
          <TheaCharacter size="compact" pose={pose} reaction={reaction} speaking={false} className="u-thea-character--chat" />
        )}
        <div className="min-w-0 flex-1 text-left">
          {!composerFocused && (
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: U.accent }}>
              Your gifting agent
            </div>
          )}
          <div className={`font-display leading-tight ${composerFocused ? 'text-[18px]' : 'text-[22px]'}`} style={{ color: U.ink }}>
            Thea
          </div>
          <div className="truncate text-[11.5px]" style={{ color: U.muted }} aria-live="polite">
            {STATUS_LINE[pose] || 'Here when you need me'}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pt-4 pr-1"
        style={{ scrollPaddingBottom: listPadBottom }}
        aria-live="polite"
      >
        <div
          ref={chatContentRef}
          className="space-y-3"
          style={{ paddingBottom: listPadBottom }}
        >
          {history === 'loading' && (
            <p className="text-center text-[12.5px]" style={{ color: U.muted }}>Loading your conversation…</p>
          )}
          {history === 'error' && (
            <div className="rounded-[14px] px-3.5 py-2.5 text-[12.5px]" style={{ background: U.accentSoft, color: U.inkSoft }}>
              Couldn’t load your earlier conversation.{' '}
              <button type="button" onClick={() => void loadHistory()} className="min-h-8 font-semibold" style={{ color: U.accent }}>
                Try again
              </button>
            </div>
          )}
          {messages.map((message, index) =>
            message.role === 'user' ? (
              <div key={index} className="flex flex-col items-end">
                <div
                  className="max-w-[85%] rounded-[18px] rounded-tr-[6px] px-3.5 py-2.5 text-[14px] leading-5"
                  style={{ background: U.ink, color: U.buttonText, opacity: message.failed ? 0.6 : 1 }}
                >
                  {message.content}
                </div>
                {message.failed && (
                  <p className="mt-1 text-[12px]" style={{ color: U.accent }}>
                    Didn’t send.{' '}
                    <button type="button" onClick={() => retry(index)} disabled={sending} className="min-h-8 font-semibold underline-offset-2 hover:underline">
                      Retry
                    </button>
                  </p>
                )}
              </div>
            ) : (
              <div key={index} className="flex items-start gap-2">
                <TheaAvatar size={26} />
                <div className="min-w-0 max-w-[88%] flex-1">
                  <div
                    className="inline-block rounded-[18px] rounded-tl-[6px] border px-3.5 py-2.5 text-[14px] leading-5"
                    style={{ background: U.surface, borderColor: U.border, color: U.ink }}
                  >
                    {index === messages.length - 1 && !sending ? (
                      <TypewriterText text={message.content} />
                    ) : (
                      <span>{renderTheaText(message.content)}</span>
                    )}
                  </div>
                  {message.unsaved && (
                    <p className="mt-1 text-[12px]" style={{ color: U.accent }}>Something here didn’t save, so nothing changed.</p>
                  )}
                  {message.products && message.products.length > 0 && (
                    <ProductCards products={message.products} selectedId={selectedProductId} disabled={sending} onSelect={selectProduct} />
                  )}
                  {message.review && (
                    <ReviewCard
                      review={message.review}
                      state={reviewStates[reviewKey(message.review)] || 'pending'}
                      disabled={sending || index !== latestReviewIndex}
                      onConfirm={() => void confirmReview(message.review!)}
                      onChange={() => void send('Let’s look at other options.')}
                      onAddAddress={() => onOpenRecipient(message.review!.recipientId, 'address')}
                      onViewPlan={() => onOpenRecipient(message.review!.recipientId, 'open')}
                    />
                  )}
                  {message.ui && message.ui.length > 0 && (
                    <ChatUiModules
                      modules={message.ui}
                      onAddRecipient={onAddRecipient}
                      onEditRecipient={onEditRecipient}
                    />
                  )}
                </div>
              </div>
            ),
          )}
          {sending && (
            <div className="flex items-start gap-2">
              <TheaAvatar size={26} pose="thinking" />
              <div
                className="rounded-[18px] rounded-tl-[6px] border px-3.5 py-2.5 text-[13.5px]"
                style={{ background: U.surface, borderColor: U.border, color: U.subtle }}
              >
                Thinking…
              </div>
            </div>
          )}
        </div>
      </div>

      {!composerFocused && messages.length <= 2 && (chips.length > 0 || !calendarConnected) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={`${chip.recipientId}-${chip.label}`}
              type="button"
              onClick={() => handleChip(chip)}
              className="u-press min-h-10 rounded-full border px-3 py-2 text-left text-[12.5px] font-medium"
              style={{ background: U.chip, borderColor: 'rgba(42,37,32,0.1)', color: '#5A5147' }}
            >
              {chip.label}
            </button>
          ))}
          {!calendarConnected && (
            <button
              type="button"
              onClick={() => void startCalendarConnect('/?tab=manual').catch(() => onSwitchToManual())}
              className="u-press min-h-10 rounded-full border px-3 py-2 text-[12.5px] font-medium"
              style={{ background: U.surface, borderColor: U.border, color: U.ink }}
            >
              Connect Google Calendar
            </button>
          )}
          <button
            type="button"
            onClick={onSwitchToManual}
            className="u-press min-h-10 rounded-full border px-3 py-2 text-[12.5px] font-medium"
            style={{ background: U.surface, borderColor: U.border, color: U.muted }}
          >
            Open calendar
          </button>
        </div>
      )}

      <form
        ref={composerRef}
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className={`u-thea-composer shrink-0${composerFocused ? ' u-thea-composer--focused' : ''}`}
      >
        <div className="flex items-end gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={() => {
              window.clearTimeout(blurTimer.current);
              setFocused(true);
            }}
            onBlur={() => {
              // Delay so tapping Send still counts as an in-composer interaction
              // before we restore the tab bar.
              window.clearTimeout(blurTimer.current);
              blurTimer.current = window.setTimeout(() => setFocused(false), 120);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            placeholder="Ask Thea about gifts, people, or what's next…"
            aria-label="Message Thea"
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            className="u-thea-composer__input min-w-0 flex-1"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="u-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-35"
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

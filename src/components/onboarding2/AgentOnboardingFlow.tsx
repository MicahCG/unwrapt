import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeRecipientName } from '@/lib/dateUtils';
import { MobileShell, Eyebrow, PrimaryButton, Display } from '@/components/unwrapt2/MobileShell';
import { PersonAvatar } from '@/components/unwrapt2/TheaAvatar';
import { useTheaReaction } from '@/hooks/useTheaReaction';
import { theaChatPose } from '@/lib/theaState';
import { classifyUserReply } from '@/lib/theaReactions';
import { withAccountPicker } from '@/lib/calendarConnection';
import BirthdaySourcePicker from '@/components/birthdays/BirthdaySourcePicker';
import { SOURCE_LABEL, type BirthdaySource, type FoundOccasion } from '@/lib/birthdaySources';
import { TheaCharacter } from '@/components/unwrapt2/TheaCharacter';
import { U, toneForIndex, initialsOf } from '@/components/unwrapt2/theme';
import { format } from 'date-fns';
import { trackProductEvent } from '@/lib/productAnalytics';
import GachaReveal from '@/components/onboarding2/GachaReveal';
import StrongGiftPicks from '@/components/onboarding2/StrongGiftPicks';
import { clearSkipAgentWelcome, markTheaValueSeen } from '@/lib/funnel';
import SubscriptionTerms, { useVipPrice } from '@/components/subscription/SubscriptionTerms';
import { type GiftAskUserOffer, type GiftCatalogItem } from '@/lib/giftCatalog';
import {
  STARTER_CATEGORIES,
  CATEGORY_FOLLOWUPS,
  type InterestSignal,
  isDiscoveryReady,
  isStarterCategory,
  searchLabelsFromSignals,
  signalFromCategory,
  signalFromText,
  upsertSignal,
} from '@/lib/interestDiscovery';

interface AgentOnboardingFlowProps {
  /** Called once recipients are created so the parent can show the dashboard. */
  onComplete: () => void | Promise<void>;
}

interface CalendarEvent {
  summary?: string;
  date: string | null;
  type: 'birthday' | 'anniversary';
  personName: string;
}

interface Person {
  id: string;
  name: string;
  relationship: string | null;
  birthday: string | null;
  anniversary: string | null;
  primaryType: 'birthday' | 'anniversary' | null;
  primaryDate: string | null;
  interests: string[];
  selected: boolean;
  tone: string;
  fromCalendar: boolean;
}

type Screen = 'import' | 'found' | 'addperson' | 'intel' | 'reveal' | 'subscription';

const FREE_TIER_LIMIT = 3;

const REL_OPTIONS = ['Friend', 'Family', 'Partner', 'Colleague', 'Mentor'];

/** Silent defaults  -  budget/autopilot UI deferred until post-subscribe gift config. */
const DEFAULT_BUDGET = { lo: 50, hi: 150 };
const DEFAULT_AUTOPILOT = 'always';

function firstNameOf(name: string) {
  return (name || '').trim().split(/\s+/)[0] || 'them';
}

function groupEventsIntoPeople(events: CalendarEvent[]): Person[] {
  const map = new Map<string, Person>();
  events.forEach((event) => {
    if (!event.personName) return;
    const key = event.personName.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, {
        id: `cal-${key}`,
        name: event.personName,
        relationship: null,
        birthday: event.type === 'birthday' ? event.date : null,
        anniversary: event.type === 'anniversary' ? event.date : null,
        primaryType: event.type,
        primaryDate: event.date,
        interests: [],
        selected: true,
        tone: toneForIndex(map.size),
        fromCalendar: true,
      });
    } else {
      const p = map.get(key)!;
      if (event.type === 'birthday' && !p.birthday) p.birthday = event.date;
      if (event.type === 'anniversary' && !p.anniversary) p.anniversary = event.date;
    }
  });
  // Choose the first person by default so this step always has one clear focus.
  return Array.from(map.values())
    .sort((a, b) => nextOccasionTime(a.primaryDate) - nextOccasionTime(b.primaryDate))
    .map((p, i) => ({ ...p, selected: i === 0 }));
}

function nextOccasionTime(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = parsePersonDate(value);
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY;
  const now = new Date();
  const next = new Date(now.getFullYear(), parsed.getMonth(), parsed.getDate());
  if (next.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next.getTime();
}

function parsePersonDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  return new Date(value);
}

function formatDateLabel(p: Person): string {
  if (!p.primaryDate) return p.relationship || 'No date yet';
  try {
    return format(parsePersonDate(p.primaryDate), 'MMM d');
  } catch {
    return p.primaryDate;
  }
}

const TYPE_MS = 26;

/** Lightweight typewriter for onboarding speech bubbles. */
function TypewriterLine({
  text,
  speedMs = TYPE_MS,
  enabled = true,
  className,
  style,
  caret = true,
  onComplete,
}: {
  text: string;
  speedMs?: number;
  enabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  caret?: boolean;
  onComplete?: () => void;
}) {
  const [shown, setShown] = useState(enabled ? '' : text);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    doneRef.current = false;
    if (!enabled) {
      setShown(text);
      if (!doneRef.current) {
        doneRef.current = true;
        onCompleteRef.current?.();
      }
      return;
    }
    setShown('');
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        if (!doneRef.current) {
          doneRef.current = true;
          onCompleteRef.current?.();
        }
      }
    }, speedMs);
    return () => window.clearInterval(id);
  }, [text, speedMs, enabled]);

  const done = shown.length >= text.length;
  return (
    <span className={className} style={style}>
      {shown}
      {caret && !done && (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 2,
            height: '0.85em',
            marginLeft: 2,
            background: U.accent,
            verticalAlign: '-0.1em',
            animation: 'u-blink 1s step-end infinite',
          }}
        />
      )}
    </span>
  );
}

/** Hold a title briefly, then typewriter into a follow-up prompt. */
function HoldThenType({
  hold,
  next,
  holdMs = 1500,
  onComplete,
}: {
  hold: React.ReactNode;
  next: string;
  holdMs?: number;
  onComplete?: () => void;
}) {
  const [phase, setPhase] = useState<'hold' | 'type'>('hold');

  useEffect(() => {
    setPhase('hold');
    const t = window.setTimeout(() => setPhase('type'), holdMs);
    return () => window.clearTimeout(t);
  }, [holdMs, next]);

  if (phase === 'hold') return <>{hold}</>;
  return <TypewriterLine text={next} onComplete={onComplete} />;
}

/** Duolingo-style step pips  -  cleaner than "STEP X OF 4". */
function StepPips({ step, total = 4 }: { step: number; total?: number }) {
  return (
    <div className="mb-2 flex items-center justify-center gap-1.5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={total} aria-label={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <div
            key={n}
            style={{
              height: 6,
              width: current ? 22 : 6,
              borderRadius: 99,
              background: done || current ? U.accent : 'rgba(42,37,32,0.14)',
              transition: 'width 280ms ease, background 280ms ease',
            }}
          />
        );
      })}
    </div>
  );
}

function ImportPromptScreen({
  connecting,
  onConnect,
  onFound,
  onAddManually,
  onUseDifferentAccount,
  notice,
}: {
  connecting: boolean;
  onConnect: () => void;
  /** Contacts, Apple Calendar, a file or a typed list; the parent shows the review. */
  onFound: (occasions: FoundOccasion[], source: BirthdaySource) => void;
  onAddManually: () => void;
  onUseDifferentAccount: () => void;
  /** What happened on the last attempt, so a cancel or empty source is never a dead end. */
  notice: string | null;
}) {
  const [ready, setReady] = useState(false);
  const reveal: React.CSSProperties = {
    opacity: ready ? 1 : 0,
    transform: ready ? 'translateY(0)' : 'translateY(8px)',
    transition: 'opacity 320ms ease, transform 320ms ease',
    pointerEvents: ready ? 'auto' : 'none',
  };

  return (
    <MobileShell
      contentClassName="overflow-y-auto px-5 pt-5 pb-4"
      footer={
        <div style={reveal}>
          <button
            type="button"
            onClick={onAddManually}
            disabled={connecting}
            className="u-press min-h-11 w-full text-[13.5px] font-semibold disabled:opacity-50"
            style={{ color: U.ink }}
          >
            Add one person myself
          </button>
          <p
            className="mt-1 flex items-center justify-center gap-1.5 text-center"
            style={{ color: U.muted, fontSize: 10.5, opacity: 0.7, letterSpacing: '0.02em' }}
          >
            <ShieldCheck size={12} aria-hidden="true" />
            <span>Read-only · nothing is saved until you choose who to add</span>
          </p>
        </div>
      }
    >
      <StepPips step={1} />
      <TheaCharacter size="medium" pose={notice ? 'thinking' : 'basic'} />
      <div
        className="-mt-2 shrink-0 rounded-[22px] border bg-white/80 px-5 py-4 text-center"
        style={{ borderColor: U.border }}
        aria-live="polite"
      >
        <Display style={{ fontSize: 23, lineHeight: 1.25, fontWeight: 500 }}>
          <TypewriterLine
            text="Where do you keep birthdays? I’ll find the dates worth planning for."
            onComplete={() => setReady(true)}
          />
        </Display>
      </div>
      {notice && (
        <div className="mx-auto mt-3 w-full shrink-0 rounded-[16px] px-4 py-3 text-center text-[13px] leading-5" role="status" style={{ background: U.accentSoft, color: U.inkSoft }}>
          {notice}
          {/* Kept here, not only in the footer, so they're visible above mobile browser toolbars. */}
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button type="button" onClick={onAddManually} disabled={connecting} className="u-press min-h-11 rounded-[12px] px-2 text-[12.5px] font-semibold disabled:opacity-50" style={{ background: U.ink, color: U.buttonText }}>
              Add someone myself
            </button>
            <button type="button" onClick={onUseDifferentAccount} disabled={connecting} className="u-press min-h-11 rounded-[12px] border px-2 text-[12.5px] font-semibold disabled:opacity-50" style={{ borderColor: 'rgba(42,37,32,0.18)', color: U.ink, background: U.surface }}>
              Use a different Google account
            </button>
          </div>
        </div>
      )}
      <div className="mt-3 shrink-0" style={reveal}>
        <BirthdaySourcePicker
          onFound={onFound}
          onGoogle={onConnect}
          googleBusy={connecting}
          googleLabel={connecting ? 'Opening Google…' : undefined}
        />
      </div>
    </MobileShell>
  );
}

function FoundPeopleScreen({
  people,
  focusingId,
  selectedFirst,
  onSelect,
  onContinue,
  sourceLabel,
}: {
  sourceLabel: string;
  people: Person[];
  focusingId: string | null;
  selectedFirst: string;
  onSelect: (id: string) => void;
  onContinue: () => void;
}) {
  const [listReady, setListReady] = useState(false);
  const selectedCount = people.filter((p) => p.selected).length;

  return (
    <MobileShell
      contentClassName="px-5 pt-5 pb-4"
      footer={
        <div
          style={{
            opacity: listReady ? 1 : 0,
            transform: listReady ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 320ms ease, transform 320ms ease',
            pointerEvents: listReady ? 'auto' : 'none',
          }}
        >
          <PrimaryButton onClick={onContinue} disabled={!listReady || selectedCount === 0 || !!focusingId}>
            {focusingId ? `Starting with ${selectedFirst}…` : `Continue with ${selectedFirst}`}
          </PrimaryButton>
        </div>
      }
    >
      <StepPips step={2} />
      <TheaCharacter size="medium" pose="basic" />
      <div
        className="-mt-2 mb-4 w-full shrink-0 rounded-[22px] border bg-white px-5 py-4 text-center"
        style={{ borderColor: U.border }}
        aria-live="polite"
      >
        <Display style={{ fontSize: 24, lineHeight: 1.25, fontWeight: 500 }}>
          {focusingId ? (
            `Let’s start with ${selectedFirst}.`
          ) : (
            <>
              I found{' '}
              <span style={{ color: U.accent }}>
                {people.length} {people.length === 1 ? 'person' : 'people'}
              </span>{' '}
              in {sourceLabel}.
            </>
          )}
        </Display>
        {!focusingId && (
          <p className="mt-2 min-h-[22px] text-[14.5px] leading-5" style={{ color: U.textSecondary }}>
            <TypewriterLine
              text="Choose one person to get started."
              speedMs={22}
              onComplete={() => setListReady(true)}
            />
          </p>
        )}
      </div>
      <div
        className="flex w-full flex-col gap-2.5"
        role="radiogroup"
        aria-label="Choose one person to start with"
        style={{
          opacity: listReady || focusingId ? 1 : 0.35,
          transform: listReady || focusingId ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 380ms ease, transform 380ms ease',
          pointerEvents: listReady || focusingId ? 'auto' : 'none',
        }}
      >
        {people.map((p) => (
          <button
            type="button"
            key={p.id}
            onClick={() => onSelect(p.id)}
            disabled={!!focusingId}
            role="radio"
            aria-checked={p.selected}
            className="flex w-full cursor-pointer items-center gap-3.5 text-left"
            style={{
              padding: '13px 14px', borderRadius: 18, background: U.surface, border: `1px solid ${U.border}`,
              transform: focusingId ? (p.id === focusingId ? 'scale(1.045)' : 'scale(.91)') : 'scale(1)',
              opacity: focusingId && p.id !== focusingId ? 0.35 : 1,
              transition: 'transform 700ms cubic-bezier(.22,1,.36,1), opacity 500ms ease',
            }}
          >
            <PersonAvatar initials={initialsOf(p.name)} tone={p.tone} dim={!p.selected} />
            <div className="min-w-0 flex-1" style={{ opacity: p.selected ? 1 : 0.5 }}>
              <div style={{ fontWeight: 600, fontSize: 15.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ fontSize: 12.5, color: U.muted }}>
                {p.relationship ? `${p.relationship} · ` : ''}{formatDateLabel(p)}
              </div>
            </div>
            <div
              className="flex items-center justify-center"
              style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0, fontSize: 14,
                background: p.selected ? U.accent : 'transparent',
                border: p.selected ? `1.5px solid ${U.accent}` : '1.5px solid rgba(42,37,32,0.22)',
                color: p.selected ? U.cream : 'transparent',
              }}
            >
              ✓
            </div>
          </button>
        ))}
      </div>
    </MobileShell>
  );
}

const AgentOnboardingFlow: React.FC<AgentOnboardingFlowProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const vipPrice = useVipPrice();

  // The welcome now lives on the sign-in screen, so signed-in setup starts at importing birthdays.
  const [screen, setScreen] = useState<Screen>('import');
  const [scanning, setScanning] = useState(false);
  const [calendarNotice, setCalendarNotice] = useState<string | null>(() => {
    // The calendar OAuth callback returns here with ?calendar=<result>.
    const result = new URLSearchParams(window.location.search).get('calendar');
    if (!result || result === 'connected') return null;
    const url = new URL(window.location.href);
    url.searchParams.delete('calendar');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    if (result === 'cancelled') return 'No problem, nothing was connected. Try again, or add someone yourself.';
    if (result === 'expired') return 'That Google sign-in expired before it finished. Try once more.';
    return 'Google didn’t finish connecting. Try again, or add someone yourself.';
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [peopleSource, setPeopleSource] = useState<BirthdaySource>('google');
  const [scanLabel, setScanLabel] = useState('Reading your calendar…');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusingId, setFocusingId] = useState<string | null>(null);

  // Intel chat state: learn about the recipient before any gift shopping UI.
  const [intelMessages, setIntelMessages] = useState<{ from: 'thea' | 'user'; text: string }[]>([]);
  const [intelSignals, setIntelSignals] = useState<InterestSignal[]>([]);
  const [followUpChips, setFollowUpChips] = useState<string[]>([]);
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [intelInput, setIntelInput] = useState('');
  const [intelComposerFocused, setIntelComposerFocused] = useState(false);
  const { reaction: theaReaction, reactTo, play: playReaction } = useTheaReaction();
  const [intelSending, setIntelSending] = useState(false);
  const [revealPicks, setRevealPicks] = useState<GiftCatalogItem[]>([]);
  const [unmatchedRevealInterests, setUnmatchedRevealInterests] = useState<string[]>([]);
  const [revealAskUser, setRevealAskUser] = useState<GiftAskUserOffer[]>([]);
  const intelRequest = useRef(0);
  const intelFacts = useMemo(() => searchLabelsFromSignals(intelSignals), [intelSignals]);
  const discoveryReady = useMemo(() => isDiscoveryReady(intelSignals), [intelSignals]);
  useEffect(() => {
    intelRequest.current += 1;
    setIntelSending(false);
    return () => { intelRequest.current += 1; };
  }, [screen, activeId]);

  // Manual add-person draft
  const [draft, setDraft] = useState({ name: '', relationship: 'Friend', date: '' });

  const [completing, setCompleting] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);

  const selectedPeople = useMemo(() => people.filter((p) => p.selected), [people]);
  const activePerson = useMemo(() => people.find((p) => p.id === activeId) || null, [people, activeId]);

  useEffect(() => {
    void trackProductEvent('onboarding_step_viewed', { step: screen });
  }, [screen]);

  useEffect(() => {
    if (screen !== 'found' || !focusingId) return;
    const timer = window.setTimeout(() => {
      enterIntel(focusingId);
      setFocusingId(null);
    }, 1250);
    return () => window.clearTimeout(timer);
    // Runs once after the chosen person expands in the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, focusingId]);

  useEffect(() => {
    if (screen !== 'subscription' || !activePerson) return;
    markTheaValueSeen();
    void trackProductEvent('onboarding_gift_proof_shown', {
      recipient: firstNameOf(activePerson.name),
      interests: activePerson.interests.length,
    });
  }, [screen, activePerson]);

  // ── Calendar integration (faithful to the original CalendarStep logic) ──────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: integrations, error } = await supabase.rpc('get_my_calendar_integration');
        if (error || cancelled) return;
        if (integrations && integrations.length > 0) {
          const integration = integrations[0];
          if (integration.is_connected && !integration.is_expired) {
            setIsConnected(true);
            // If we land back here connected (e.g. after OAuth), pull events.
            await fetchCalendarEvents(true);
          }
        }
      } catch (e) {
        console.error('Calendar integration check failed:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const connectGoogleCalendar = async ({ chooseAccount = false }: { chooseAccount?: boolean } = {}) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in again to connect Google Calendar.',
        variant: 'destructive',
      });
      return;
    }

    setConnecting(true);
    const { appOrigin, isNativeApp } = await import('@/lib/native');
    const { openExternalAuthUrl } = await import('@/lib/nativeBootstrap');
    const redirectUri = `${appOrigin()}/auth/calendar/callback`;

    try {
      try {
        sessionStorage.setItem('unwrapt_calendar_redirect_uri', redirectUri);
        sessionStorage.setItem('unwrapt_calendar_return_to', '/onboarding');
      } catch {
        /* ignore */
      }

      let {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        const refreshed = await supabase.auth.refreshSession();
        session = refreshed.data.session;
      }
      if (!session?.access_token) {
        throw new Error('No active session found. Please log in again.');
      }

      const invokePromise = supabase.functions.invoke('google-calendar', {
        body: { action: 'get_auth_url', redirectUri },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('Calendar connection timed out. Please try again.')), 20000);
      });

      const { data: authData, error: authError } = await Promise.race([invokePromise, timeoutPromise]);

      if (authError) {
        let detail = authError.message || 'Failed to get authorization URL';
        const response = (authError as { context?: unknown }).context;
        if (response instanceof Response) {
          try {
            const payload = (await response.clone().json()) as { error?: string; message?: string };
            detail = payload.error || payload.message || detail;
          } catch {
            /* keep SDK message */
          }
        }
        throw new Error(detail);
      }
      if (authData && typeof authData === 'object' && 'error' in authData && (authData as { error?: unknown }).error) {
        throw new Error(String((authData as { error: unknown }).error));
      }

      const authUrl = authData && typeof authData === 'object' ? (authData as { authUrl?: unknown }).authUrl : null;
      if (!authUrl || typeof authUrl !== 'string') {
        throw new Error('No authorization URL returned. Please try again.');
      }

      const destination = chooseAccount ? withAccountPicker(authUrl) : authUrl;
      if (isNativeApp()) {
        await openExternalAuthUrl(destination);
        setConnecting(false);
      } else {
        window.location.assign(destination);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect calendar';
      toast({ title: 'Connection failed', description: message, variant: 'destructive' });
      setConnecting(false);
    }
  };

  const fetchCalendarEvents = async (autoAdvance = false) => {
    setScanning(true);
    if (autoAdvance) setScreen('import');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setScanning(false);
        return;
      }
      const { data: eventsData, error: eventsError } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'fetch_events' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (eventsError) throw new Error(eventsError.message || 'Failed to fetch calendar events');

      const events: CalendarEvent[] = eventsData?.events || [];
      const grouped = groupEventsIntoPeople(events);

      // Brief "reading your calendar" beat for the concierge feel.
      setTimeout(() => {
        setScanning(false);
        if (grouped.length > 0) {
          setPeople(grouped);
          setScreen('found');
        } else {
          setCalendarNotice('Your calendar is connected, but I didn’t find birthdays or anniversaries yet. Add someone yourself and I’ll take it from there.');
        }
      }, 1400);
    } catch (error) {
      console.error('Calendar fetch failed', error);
      setCalendarNotice('I couldn’t read your calendar just now. Try again, or add someone yourself.');
      setScanning(false);
    }
  };

  /** Results from Contacts, Apple Calendar, a file or a typed list, shown in the same review. */
  const handleFoundOccasions = (occasions: FoundOccasion[], source: BirthdaySource) => {
    const grouped = groupEventsIntoPeople(occasions.map((o) => ({ personName: o.personName, date: o.date, type: o.type })));
    void trackProductEvent('birthday_source_results', { source, people: grouped.length });
    if (!grouped.length) {
      setCalendarNotice(`I didn’t find birthdays or anniversaries in ${SOURCE_LABEL[source]}. Try another option, or add someone yourself.`);
      return;
    }
    setCalendarNotice(null);
    setPeopleSource(source);
    if (source === 'typed') {
      setPeople(grouped);
      setScreen('found');
      return;
    }
    // The same short "reading" beat as Google, for the concierge feel.
    setScanLabel(source === 'contacts' ? 'Reading your contacts…' : 'Reading your calendar…');
    setScanning(true);
    window.setTimeout(() => {
      setScanning(false);
      setPeople(grouped);
      setScreen('found');
    }, 1100);
  };

  const handleFindMyPeople = () => {
    setPeopleSource('google');
    setScanLabel('Reading your calendar…');
    if (isConnected) {
      fetchCalendarEvents();
    } else {
      connectGoogleCalendar();
    }
  };

  // ── People selection ────────────────────────────────────────────────────────
  const selectPerson = (id: string) => {
    setPeople((prev) => prev.map((p) => ({ ...p, selected: p.id === id })));
  };

  const focusSelectedPerson = () => {
    const selectedPerson = selectedPeople[0];
    if (!selectedPerson) return;
    setActiveId(selectedPerson.id);
    setFocusingId(selectedPerson.id);
  };

  // ── Manual add person ─────────────────────────────────────────────────────────
  const startManualAdd = () => {
    setDraft({ name: '', relationship: 'Friend', date: '' });
    setScreen('addperson');
  };

  const confirmManualPerson = () => {
    if (!draft.name.trim()) return;
    const person: Person = {
      id: `manual-${Date.now()}`,
      name: draft.name.trim(),
      relationship: draft.relationship,
      birthday: null,
      anniversary: null,
      primaryType: null,
      primaryDate: draft.date || null,
      interests: [],
      selected: true,
      tone: toneForIndex(people.length),
      fromCalendar: false,
    };
    setPeople((prev) => [...prev.map((p) => ({ ...p, selected: false })), person]);
    enterIntel(person.id, person);
  };

  // ── Intel chat ────────────────────────────────────────────────────────────────
  const syncPersonInterests = (personId: string, signals: InterestSignal[]) => {
    const labels = searchLabelsFromSignals(signals);
    setPeople((prev) => prev.map((p) => (p.id === personId ? { ...p, interests: labels } : p)));
  };

  const enterIntel = (id?: string, personOverride?: Person) => {
    const target = id || selectedPeople[0]?.id || people[0]?.id || null;
    if (!target) {
      startManualAdd();
      return;
    }
    const person = personOverride || people.find((p) => p.id === target);
    const first = firstNameOf(person?.name || '');
    setActiveId(target);
    const seeded: InterestSignal[] = (person?.interests || []).map((interest) =>
      isStarterCategory(interest)
        ? signalFromCategory(interest)
        : signalFromText(interest, null),
    );
    setIntelSignals(seeded);
    setFollowUpChips([]);
    setPendingCategory(null);
    setIntelInput('');
    setIntelComposerFocused(false);
    setRevealPicks([]);
    setUnmatchedRevealInterests([]);
    setRevealAskUser([]);
    setIntelMessages([
      {
        from: 'thea',
        text: `What's ${first} into? Tap a starting point, or tell me in your own words. I'll dig in before I show gifts.`,
      },
    ]);
    setScreen('intel');
  };

  const sendIntelMessage = async (text: string, selectedInterest?: string) => {
    const message = text.trim().slice(0, 2000);
    if (!activePerson || !message || intelSending) return;
    const personId = activePerson.id;
    const first = firstNameOf(activePerson.name);
    const request = ++intelRequest.current;
    const isCategoryPick = Boolean(selectedInterest && isStarterCategory(selectedInterest));
    const categoryContext = pendingCategory;
    // Thea reacts to the answer itself, before her reply arrives.
    reactTo(message);
    const isRude = classifyUserReply(message) === 'negative';

    // What the user typed, kept only until Thea reads it into gift directions.
    const typed = signalFromText(message, categoryContext);
    let nextSignals = intelSignals;
    if (isRude) {
      // A rude message is not an interest; keep what we already learned.
    } else if (selectedInterest) {
      if (isCategoryPick) {
        nextSignals = upsertSignal(intelSignals, signalFromCategory(selectedInterest));
        setPendingCategory(selectedInterest);
      } else {
        nextSignals = upsertSignal(
          intelSignals,
          signalFromText(selectedInterest, categoryContext),
        );
        setPendingCategory(null);
        setFollowUpChips([]);
      }
    } else {
      nextSignals = upsertSignal(intelSignals, typed);
      setPendingCategory(null);
      setFollowUpChips([]);
    }

    const nextMessages = [...intelMessages, { from: 'user' as const, text: message }];
    setIntelMessages(nextMessages);
    setIntelInput('');
    setIntelSending(true);
    setIntelSignals(nextSignals);
    syncPersonInterests(personId, nextSignals);

    // Broad category chips: acknowledge + narrow, never jump to products.
    if (isCategoryPick && selectedInterest) {
      const follow = CATEGORY_FOLLOWUPS[selectedInterest];
      const reply = follow
        ? follow.prompt(first)
        : `Got it. What about ${selectedInterest.toLowerCase()} matters most for ${first}?`;
      if (follow) setFollowUpChips(follow.chips);
      window.setTimeout(() => {
        if (request !== intelRequest.current) return;
        setIntelMessages((m) => [...m, { from: 'thea', text: reply }]);
        setIntelSending(false);
      }, 280);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('thea-chat', {
        body: {
          mode: 'onboarding',
          recipientName: first,
          interests: searchLabelsFromSignals(nextSignals),
          signals: nextSignals,
          pendingCategory: categoryContext,
          messages: nextMessages.slice(-30).map((m) => ({
            role: m.from === 'thea' ? 'assistant' : 'user',
            content: m.text,
          })),
        },
      });
      if (request !== intelRequest.current) return;
      if (error || !data?.success || typeof data.reply !== 'string') throw new Error('Thea unavailable');

      const learned: string[] = Array.isArray(data.interests)
        ? data.interests.filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 80)
        : [];
      // Thea's reading of the person ("Funny gifts", "Spa & relaxation") replaces the raw
      // sentence, which would make a poor catalog search, and a detour adds nothing.
      let merged = nextSignals.filter((signal) => signal.interest.toLowerCase() !== typed.interest.toLowerCase());
      if (learned.length) {
        for (const label of learned) {
          merged = upsertSignal(merged, {
            category: categoryContext,
            interest: label.trim(),
            details: null,
            confidence: data.ready === true ? 'high' : 'low',
          });
        }
      }
      // Trust Thea when she says the signal is strong enough.
      if (data.ready === true && !isDiscoveryReady(merged) && merged.length) {
        merged = merged.map((signal, index) =>
          index === 0 ? { ...signal, confidence: 'high' as const } : signal,
        );
      }
      setIntelSignals(merged);
      syncPersonInterests(personId, merged);

      const chips = Array.isArray(data.followUps)
        ? data.followUps
          .filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 40)
          .slice(0, 6)
        : [];
      setFollowUpChips(data.ready === true ? [] : chips);

      const reply = data.reply.replace(/\s*[\u2014\u2013]\s*/g, ', ').trim();
      if (request !== intelRequest.current) return;
      if (data.tone === 'rude') playReaction('upset');
      else if (data.tone === 'funny' && !isRude) playReaction('laugh');
      setIntelMessages((m) => [...m, { from: 'thea', text: reply }]);
    } catch {
      if (request !== intelRequest.current) return;
      let fallback = nextSignals;
      if (!fallback.length && message.length <= 80) {
        fallback = upsertSignal([], signalFromText(message, categoryContext));
        setIntelSignals(fallback);
        syncPersonInterests(personId, fallback);
      }
      // Thea is unreachable: acknowledge without echoing their words back as a list.
      const reply = isDiscoveryReady(fallback)
        ? `Got it, that helps me picture ${first}. Tap below when you want to see ideas.`
        : `Got it. What else does ${first} love?`;
      if (request !== intelRequest.current) return;
      setIntelMessages((m) => [...m, { from: 'thea', text: reply }]);
    } finally {
      if (request === intelRequest.current) setIntelSending(false);
    }
  };

  const addInterest = (label: string) => {
    if (intelSignals.some((s) => s.interest.toLowerCase() === label.toLowerCase() && s.confidence !== 'low')) {
      return;
    }
    void sendIntelMessage(label, label);
  };
  const submitInterest = () => {
    void sendIntelMessage(intelInput);
  };

  const startReveal = () => {
    if (!intelFacts.length || !activePerson) return;
    setPeople((prev) =>
      prev.map((p) => (p.id === activePerson.id ? { ...p, interests: intelFacts } : p)),
    );
    setScreen('reveal');
  };

  const finishReveal = useCallback((
    picks: GiftCatalogItem[],
    unmatched: string[] = [],
    askUser: GiftAskUserOffer[] = [],
  ) => {
    setRevealPicks(picks);
    setUnmatchedRevealInterests(unmatched);
    setRevealAskUser(askUser);
    setScreen('subscription');
  }, []);

  const occasionPhrase = (person: Person | null) => {
    if (!person?.primaryType) return null;
    if (person.primaryType === 'birthday') return 'birthday';
    if (person.primaryType === 'anniversary') return 'anniversary';
    return null;
  };

  // ── Completion: save people, then Stripe checkout only (no free dashboard bypass) ─
  const completeOnboarding = async () => {
    if (!user?.id) return;
    const chosen = people.filter((p) => p.selected);
    if (chosen.length === 0) {
      toast({
        title: 'Add someone first',
        description: 'Pick at least one person for Thea to look after.',
        variant: 'destructive',
      });
      startManualAdd();
      return;
    }
    setStartingCheckout(true);
    setCompleting(true);
    try {
      // Dedup against existing recipients by normalized name.
      const { data: existing } = await supabase
        .from('recipients')
        .select('name')
        .eq('user_id', user.id);
      const existingNames = new Set((existing || []).map((r) => normalizeRecipientName(r.name)));

      const toCreate = chosen.filter((p) => !existingNames.has(normalizeRecipientName(p.name)));

      for (const person of toCreate) {
        const { error } = await supabase.from('recipients').insert({
          user_id: user.id,
          name: person.name,
          email: null,
          phone: null,
          address: null,
          interests: person.interests || [],
          birthday: person.birthday,
          anniversary: person.anniversary,
          relationship: person.relationship,
          notes: person.fromCalendar ? `Imported from ${SOURCE_LABEL[peopleSource].replace('your ', '')} during onboarding` : 'Added during onboarding',
        });
        if (error) console.error('Error creating recipient', person.name, error);
      }

      // Silent defaults. Budget/autopilot UI comes later (gift config / VIP).
      try {
        await supabase
          .from('profiles')
          .update({
            default_gift_budget_min: DEFAULT_BUDGET.lo,
            default_gift_budget_max: DEFAULT_BUDGET.hi,
            autopilot_level: DEFAULT_AUTOPILOT,
          } as never)
          .eq('id', user.id);
      } catch {
        /* preference columns may not exist yet  -  non-fatal */
      }

      try {
        await supabase.rpc('calculate_user_metrics', { user_uuid: user.id });
      } catch {
        /* metrics RPC is best-effort */
      }

      clearSkipAgentWelcome();
      markTheaValueSeen();

      await queryClient.invalidateQueries({ queryKey: ['app-access', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['recipients', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['user-metrics', user.id] });

      void trackProductEvent('onboarding_completed', {
        people_count: selectedPeople.length,
        import_method: people.some((person) => person.fromCalendar) ? 'calendar' : 'manual',
        skipped_guardrails: true,
      });
      void trackProductEvent('onboarding_subscription_checkout_started', {
        people_count: selectedPeople.length,
      });

      const { purchaseVipSubscription } = await import('@/lib/iap');
      const result = await purchaseVipSubscription();
      if (result.cancelled) {
        setCompleting(false);
        setStartingCheckout(false);
        await onComplete();
        return;
      }
      if (!result.success) throw new Error(result.error || 'Checkout failed');
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      // Native IAP — VIP granted; leave onboarding
      window.location.href = '/';
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: 'Something went wrong',
        description: 'There was a problem opening checkout. Please try again.',
        variant: 'destructive',
      });
      setCompleting(false);
      setStartingCheckout(false);
      // Recipients may already be saved  -  parent will show SubscribeGate on refresh.
      await onComplete();
    }
  };

  // ── Loading / completing splash ───────────────────────────────────────────────
  if (completing) {
    return (
      <MobileShell glow animate={false}>
        <div className="flex h-full flex-col items-center justify-center text-center">
          <TheaCharacter size="large" speaking={false} pose="thinking" />
          <Display className="mt-7 text-[27px]">
            {startingCheckout ? 'Opening secure checkout…' : 'Setting up your concierge…'}
          </Display>
          <p className="mt-2 text-[15px]" style={{ color: U.subtle }}>
            Saving your people and getting Thea ready.
          </p>
        </div>
      </MobileShell>
    );
  }

  switch (screen) {
    // ════════ IMPORT / SCANNING ════════
    case 'import':
      if (scanning) {
        return (
          <MobileShell animate={false}>
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <TheaCharacter size="large" pose="thinking" />
              <Display className="mt-7 text-[27px]">
                <TypewriterLine text={scanLabel} speedMs={32} caret={false} />
              </Display>
              <p className="mt-2" style={{ fontSize: 15, color: U.subtle, maxWidth: 260, lineHeight: 1.5 }}>
                Finding dates that matter…
              </p>
              <div className="mt-8 flex w-full max-w-[270px] flex-col gap-3">
                {[90, 70, 80].map((w, i) => (
                  <div
                    key={i}
                    style={{
                      height: 14,
                      borderRadius: 7,
                      width: `${w}%`,
                      background: 'linear-gradient(90deg,#E4DAC6,#F2EADB,#E4DAC6)',
                      backgroundSize: '440px 100%',
                      animation: `u-shimmer 1.3s linear ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </MobileShell>
        );
      }
      return (
        <ImportPromptScreen
          connecting={connecting}
          onConnect={handleFindMyPeople}
          onFound={handleFoundOccasions}
          onAddManually={startManualAdd}
          onUseDifferentAccount={() => void connectGoogleCalendar({ chooseAccount: true })}
          notice={calendarNotice}
        />
      );

    // ════════ FOUND PEOPLE ════════
    case 'found': {
      const selectedPerson = selectedPeople[0];
      const selectedFirst = firstNameOf(selectedPerson?.name || 'them');
      return (
        <FoundPeopleScreen
          people={people}
          focusingId={focusingId}
          selectedFirst={selectedFirst}
          onSelect={selectPerson}
          onContinue={focusSelectedPerson}
          sourceLabel={SOURCE_LABEL[peopleSource]}
        />
      );
    }

    // ════════ ADD PERSON (manual) ════════
    case 'addperson': {
      const npInitials = draft.name.trim() ? initialsOf(draft.name) : '＋';
      const hasName = !!draft.name.trim();
      return (
        <MobileShell
          contentClassName="px-6 pt-14 pb-4"
          footer={
            <PrimaryButton onClick={confirmManualPerson} disabled={!hasName}>
              {hasName ? `Add ${firstNameOf(draft.name)}` : 'Add their name first'}
            </PrimaryButton>
          }
        >
          <div className="mb-1 flex items-center gap-3">
            <button type="button" aria-label="Back" onClick={() => setScreen(people.length ? 'found' : 'import')} className="min-h-11 min-w-11 cursor-pointer text-left" style={{ fontSize: 22, color: U.subtle }}>‹</button>
            <div className="flex-1">
              <div style={{ fontWeight: 600, fontSize: 15.5 }}>Add someone</div>
              <Eyebrow>Thea</Eyebrow>
            </div>
          </div>
          <TheaCharacter size="compact" pose="basic" />
          <p className="font-display mb-4 mt-4" style={{ fontSize: 20, lineHeight: 1.3 }}>Who would you like me to look after?</p>
          <div className="mb-5 flex items-center gap-3.5" style={{ padding: 14, borderRadius: 18, background: U.chip }}>
            <PersonAvatar initials={npInitials} tone={U.accent} size={48} />
            <div className="min-w-0 flex-1">
              <div style={{ fontWeight: 600, fontSize: 15.5 }}>{draft.name || 'Their name'}</div>
              <div style={{ fontSize: 12.5, color: U.muted }}>{draft.relationship} · {draft.date || 'No date yet'}</div>
            </div>
          </div>
          <Eyebrow className="mb-2">Name</Eyebrow>
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Their name"
            className="mb-4 w-full"
            style={{ background: U.surface, border: '1px solid rgba(42,37,32,0.12)', borderRadius: 14, padding: '14px 16px', fontSize: 16, color: U.ink }}
          />
          <Eyebrow className="mb-2">Relationship</Eyebrow>
          <div className="mb-4 flex flex-wrap gap-2">
            {REL_OPTIONS.map((r) => {
              const sel = draft.relationship === r;
              return (
                <div
                  key={r}
                  onClick={() => setDraft((d) => ({ ...d, relationship: r }))}
                  className="cursor-pointer"
                  style={{
                    padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                    background: sel ? U.ink : U.surface,
                    color: sel ? U.buttonText : U.ink,
                    border: sel ? `1px solid ${U.ink}` : '1px solid rgba(42,37,32,0.14)',
                  }}
                >
                  {r}
                </div>
              );
            })}
          </div>
          <Eyebrow className="mb-2">Important date</Eyebrow>
          <input
            value={draft.date}
            onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
            placeholder="e.g. Birthday · Mar 3"
            className="w-full"
            style={{ background: U.surface, border: '1px solid rgba(42,37,32,0.12)', borderRadius: 14, padding: '14px 16px', fontSize: 16, color: U.ink }}
          />
        </MobileShell>
      );
    }

    // ════════ INTEL (Thea chat) ════════
    case 'intel': {
      const first = firstNameOf(activePerson?.name || '');
      const starterChips = STARTER_CATEGORIES.filter(
        (t) => !intelSignals.some((s) => s.category?.toLowerCase() === t.toLowerCase() || s.interest.toLowerCase() === t.toLowerCase()),
      ).slice(0, 3);
      const narrowChips = followUpChips.slice(0, 3);
      // Pills hide while the composer is focused so the keyboard has room; they return on blur (still capped at 3).
      const showStarterChips = !intelComposerFocused && intelSignals.length === 0;
      const showNarrowChips =
        !intelComposerFocused && intelSignals.length > 0 && !discoveryReady && narrowChips.length > 0;
      const canReveal = discoveryReady && !intelSending && intelFacts.length > 0;
      return (
        <MobileShell contentClassName="flex flex-col px-0 pt-0" animate>
          <div className="flex h-full flex-col">
            <div
              className="relative shrink-0 text-center"
              style={{ padding: '12px 20px 10px', borderBottom: `1px solid rgba(42,37,32,0.07)` }}
            >
              <button
                type="button"
                aria-label="Back to people"
                onClick={() => setScreen(people.length > 1 || activePerson?.fromCalendar ? 'found' : 'import')}
                className="absolute left-4 top-4 flex min-h-11 min-w-11 items-center text-[22px]"
                style={{ color: U.subtle }}
              >
                ‹
              </button>
              <StepPips step={3} />
              <TheaCharacter
                size="compact"
                className="mx-auto u-thea-character--chat"
                reaction={theaReaction}
                pose={theaChatPose({ sending: intelSending, typing: intelInput.trim().length > 0 })}
              />
              <div className="-mt-1">
                <div style={{ fontWeight: 600, fontSize: 15.5 }}>Getting to know {first}</div>
                <Eyebrow>
                  {discoveryReady
                    ? 'Ready for recommendations'
                    : intelSignals.length
                      ? 'Learning what they love'
                      : 'Pick a starting point'}
                </Eyebrow>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto" style={{ padding: '16px 20px 12px' }}>
              {intelMessages.map((m, i) => {
                const isLatestThea = m.from === 'thea' && i === intelMessages.length - 1 && !intelSending;
                return (
                  <div key={i} className="flex" style={{ justifyContent: m.from === 'thea' ? 'flex-start' : 'flex-end' }}>
                    <div
                      style={{
                        maxWidth: '84%',
                        padding: '13px 16px',
                        borderRadius: 20,
                        fontSize: 15,
                        lineHeight: 1.45,
                        background: m.from === 'thea' ? U.surface : U.ink,
                        color: m.from === 'thea' ? U.ink : U.buttonText,
                        border: m.from === 'thea' ? `1px solid ${U.border}` : `1px solid ${U.ink}`,
                        borderBottomLeftRadius: m.from === 'thea' ? 6 : 20,
                        borderBottomRightRadius: m.from === 'thea' ? 20 : 6,
                      }}
                    >
                      {isLatestThea ? <TypewriterLine text={m.text} speedMs={18} /> : m.text}
                    </div>
                  </div>
                );
              })}
              {intelSending && (
                <p role="status" className="text-sm" style={{ color: U.subtle }}>
                  Thea is thinking…
                </p>
              )}
            </div>

            <div className="shrink-0" style={{ padding: '8px 16px 28px' }}>
              {showStarterChips && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {starterChips.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => addInterest(c)}
                      disabled={intelSending}
                      className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        padding: '9px 14px',
                        borderRadius: 14,
                        background: U.chip,
                        border: `1px solid rgba(42,37,32,0.1)`,
                        fontSize: 13.5,
                        fontWeight: 500,
                        color: '#5A5147',
                      }}
                    >
                      + {c}
                    </button>
                  ))}
                </div>
              )}

              {showNarrowChips && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {narrowChips.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => addInterest(c)}
                      disabled={intelSending}
                      className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        padding: '9px 14px',
                        borderRadius: 14,
                        background: U.chip,
                        border: `1px solid rgba(42,37,32,0.1)`,
                        fontSize: 13.5,
                        fontWeight: 500,
                        color: '#5A5147',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {canReveal && (
                <button
                  type="button"
                  onClick={startReveal}
                  className="u-btn-primary animate-u-pop mb-3"
                  style={{ fontSize: 16, padding: 16 }}
                >
                  See gift ideas
                </button>
              )}

              <div
                className={`u-intel-composer flex items-center gap-2.5${intelComposerFocused ? ' u-intel-composer--focused' : ''}`}
              >
                <input
                  value={intelInput}
                  disabled={intelSending}
                  maxLength={2000}
                  placeholder={
                    discoveryReady
                      ? `Add anything else about ${first}…`
                      : intelSignals.length
                        ? `Tell me more about ${first}…`
                        : `Or tell me about ${first}…`
                  }
                  className="u-intel-composer__input flex-1"
                  onFocus={() => setIntelComposerFocused(true)}
                  onBlur={() => setIntelComposerFocused(false)}
                  onChange={(event) => setIntelInput(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submitInterest();
                    }
                  }}
                />
                <button
                  type="button"
                  aria-label="Send message"
                  onClick={submitInterest}
                  disabled={!intelInput.trim() || intelSending}
                  className="flex items-center justify-center disabled:opacity-40"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: U.ink,
                    color: U.buttonText,
                    fontSize: 17,
                    flexShrink: 0,
                  }}
                >
                  ↑
                </button>
              </div>
            </div>
          </div>
        </MobileShell>
      );
    }

    // ════════ GACHA REVEAL ════════
    case 'reveal': {
      if (!activePerson) return null;
      const first = firstNameOf(activePerson.name);
      return (
        <GachaReveal
          recipientFirstName={first}
          interests={activePerson.interests.length ? activePerson.interests : intelFacts}
          occasionLabel={occasionPhrase(activePerson)}
          onDone={finishReveal}
        />
      );
    }

    // ════════ REVEAL + SUBSCRIPTION (combined) ════════
    case 'subscription': {
      if (!activePerson) return null;
      const first = firstNameOf(activePerson.name);
      const occasion = occasionPhrase(activePerson);
      const interests = activePerson.interests.length ? activePerson.interests : intelFacts;
      const headline = occasion
        ? `Here are options I’d recommend for ${first}’s ${occasion}.`
        : `Here are options I’d recommend for ${first}.`;

      return (
        <MobileShell
          contentClassName="px-5 pt-8 pb-6"
          footer={
            <>
              <PrimaryButton onClick={() => completeOnboarding()} disabled={completing}>
                Start automating · {vipPrice}/month
              </PrimaryButton>
              <SubscriptionTerms price={vipPrice} onRestored={() => { window.location.href = '/'; }} />
            </>
          }
        >
          <button
            type="button"
            aria-label="Back to chat"
            onClick={() => setScreen('intel')}
            className="mb-2 min-h-11 min-w-11 text-left text-[24px]"
            style={{ color: U.subtle }}
          >
            ‹
          </button>

          <StepPips step={4} />
          <TheaCharacter size="compact" pose="gift" />
          <Display className="mt-3 text-[28px] leading-tight">{headline}</Display>
          <p className="mt-2 text-[14px] leading-5" style={{ color: U.textSecondary }}>
            Based on {interests.map((i) => i.toLowerCase()).join(', ') || 'what you shared'}. Thea watches the date and asks before anything is bought.
          </p>

          <section className="mt-5">
            <StrongGiftPicks
              recipientFirstName={first}
              interests={interests}
              products={revealPicks}
              unmatchedInterests={unmatchedRevealInterests}
              askUser={revealAskUser}
            />
          </section>

          <section className="mt-5 rounded-[20px] p-4" style={{ background: U.ink, color: U.buttonText }}>
            <div className="flex items-center gap-2">
              <Sparkles size={17} color={U.accent} aria-hidden="true" />
              <h3 className="text-[14px] font-semibold">Put gifting on autopilot</h3>
            </div>
            <p className="mt-2 text-[12.5px] leading-5" style={{ color: '#D8CFC1' }}>
              Thea keeps refining picks like these, remembers the occasion, and brings you a recommendation when it’s time. You approve before any purchase.
            </p>
          </section>

          <div className="mt-4 flex items-center justify-center gap-2 text-[11.5px]" style={{ color: U.muted }}>
            <ShieldCheck size={14} aria-hidden="true" />
            Cancel anytime · you stay in control
          </div>
        </MobileShell>
      );
    }

    default:
      return null;
  }
};


export default AgentOnboardingFlow;

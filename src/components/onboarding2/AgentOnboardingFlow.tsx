import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, Gift, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeRecipientName } from '@/lib/dateUtils';
import { MobileShell, Eyebrow, PrimaryButton, Display } from '@/components/unwrapt2/MobileShell';
import { PersonAvatar } from '@/components/unwrapt2/TheaAvatar';
import { TheaCharacter } from '@/components/unwrapt2/TheaCharacter';
import { U, toneForIndex, initialsOf } from '@/components/unwrapt2/theme';
import { format } from 'date-fns';
import { trackProductEvent } from '@/lib/productAnalytics';
import GiftRecommendationPreview from '@/components/onboarding2/GiftRecommendationPreview';
import { clearSkipAgentWelcome, markTheaValueSeen, shouldSkipAgentWelcome } from '@/lib/funnel';
import { VIP_MONTHLY_AMOUNT_LABEL, VIP_MONTHLY_PRICE_ID } from '@/lib/stripe';

interface AgentOnboardingFlowProps {
  /** Called once recipients are created so the parent can show the dashboard. */
  onComplete: () => void | Promise<void>;
}

interface CalendarEvent {
  summary?: string;
  date: string;
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

type Screen = 'welcome' | 'import' | 'found' | 'addperson' | 'intel' | 'recommendations' | 'subscription';

const FREE_TIER_LIMIT = 3;
const MAX_INTERESTS = 3;

const INTEREST_TAXONOMY = [
  'Golf', 'Travel', 'Coffee', 'Fitness', 'Cooking', 'Wine', 'Reading', 'Music',
  'Fashion', 'Gaming', 'Art', 'Pets', 'Tech', 'Outdoors', 'Whiskey', 'Premium experiences',
];

const INTEREST_REPLIES: Record<string, (n: string) => string> = {
  Golf: (n) => `Great choice. We have plenty of golf gifts, from course-day essentials to experiences ${n} will actually use.`,
  Travel: (n) => `Love that. Travel opens up useful gifts that pack well and earn a spot in ${n}'s carry-on.`,
  Coffee: () => `Luckily, we have a large selection of coffee gifts, from daily ritual upgrades to special roasts.`,
  Cooking: () => `Great! We have tons of cooking gifts. It's an especially good interest for the fall season.`,
  Fitness: (n) => `Perfect. Fitness gives me lots of practical options I can tailor to ${n}'s routine.`,
  Wine: () => `Great choice. We can explore bottles, glassware, and tasting experiences without making the gift feel generic.`,
  Reading: (n) => `That helps a lot. I can look beyond bestsellers and find something that feels personal to ${n}.`,
  Music: () => `Nice. Music gives us a broad range, from listening upgrades to memorable live experiences.`,
  Whiskey: () => `Whiskey gives us strong options, including tastings, glassware, and a really good pour.`,
  'Premium experiences': () => `Excellent. I'll watch for moments worth giving, not just objects.`,
};

const REL_OPTIONS = ['Friend', 'Family', 'Partner', 'Colleague', 'Mentor'];

/** Silent defaults — budget/autopilot UI deferred until post-subscribe gift config. */
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

const AgentOnboardingFlow: React.FC<AgentOnboardingFlowProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [screen, setScreen] = useState<Screen>(() => (shouldSkipAgentWelcome() ? 'import' : 'welcome'));
  const [scanning, setScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusingId, setFocusingId] = useState<string | null>(null);

  // Intel chat state
  const [intelMessages, setIntelMessages] = useState<{ from: 'thea' | 'user'; text: string }[]>([]);
  const [intelFacts, setIntelFacts] = useState<string[]>([]);
  const [intelInput, setIntelInput] = useState('');

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
    if (screen !== 'recommendations' || !activePerson) return;
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

  const connectGoogleCalendar = async () => {
    if (!user) return;
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session found. Please log in again.');
      const { data: authData, error: authError } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'get_auth_url' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (authError) throw new Error(authError.message || 'Failed to get authorization URL');
      if (authData?.authUrl) {
        window.location.href = authData.authUrl;
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
          toast({
            title: 'No events found',
            description: "I couldn't find birthdays or anniversaries. Let's add someone together.",
          });
          startManualAdd();
        }
      }, 1400);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch calendar events';
      toast({ title: 'Fetch failed', description: message, variant: 'destructive' });
      setScanning(false);
    }
  };

  const handleFindMyPeople = () => {
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
  const enterIntel = (id?: string, personOverride?: Person) => {
    const target = id || selectedPeople[0]?.id || people[0]?.id || null;
    if (!target) {
      startManualAdd();
      return;
    }
    const person = personOverride || people.find((p) => p.id === target);
    const first = firstNameOf(person?.name || '');
    setActiveId(target);
    setIntelFacts(person?.interests || []);
    setIntelInput('');
    setIntelMessages([
      {
        from: 'thea',
        text: `Tell me about ${first}. Pick up to ${MAX_INTERESTS} things they genuinely enjoy, and I'll show you what I could choose.`,
      },
    ]);
    setScreen('intel');
  };

  const addInterest = (label: string) => {
    const interest = label.trim();
    if (!activePerson || !interest || intelFacts.length >= MAX_INTERESTS) return;
    if (intelFacts.some((fact) => fact.toLowerCase() === interest.toLowerCase())) return;
    const first = firstNameOf(activePerson.name);
    setIntelMessages((m) => [...m, { from: 'user', text: interest }]);
    setIntelFacts((f) => [...f, interest]);
    setPeople((prev) =>
      prev.map((p) => (p.id === activeId ? { ...p, interests: [...p.interests, interest].slice(0, MAX_INTERESTS) } : p)),
    );
    const reply = INTEREST_REPLIES[interest]?.(first) || `Great, that helps. I can use ${interest.toLowerCase()} to make ${first}'s gift options feel much more personal.`;
    setTimeout(() => {
      setIntelMessages((m) => [...m, { from: 'thea', text: reply }]);
    }, 550);
  };

  const submitInterest = () => {
    addInterest(intelInput);
    setIntelInput('');
  };

  // ── Completion: create recipients (preserves original Supabase logic) ─────────
  const completeOnboarding = async (destination: 'dashboard' | 'checkout' = 'dashboard') => {
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
    setStartingCheckout(destination === 'checkout');
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
          notes: person.fromCalendar ? 'Imported from calendar during onboarding' : 'Added during onboarding',
        });
        if (error) console.error('Error creating recipient', person.name, error);
      }

      // Silent defaults + free trial window. Budget/autopilot UI comes later (gift config / VIP).
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 14);
      try {
        await supabase
          .from('profiles')
          .update({
            default_gift_budget_min: DEFAULT_BUDGET.lo,
            default_gift_budget_max: DEFAULT_BUDGET.hi,
            autopilot_level: DEFAULT_AUTOPILOT,
            trial_ends_at: trialEnds.toISOString(),
          } as never)
          .eq('id', user.id);
      } catch (e) {
        /* preference columns may not exist yet — non-fatal */
        try {
          await supabase
            .from('profiles')
            .update({ trial_ends_at: trialEnds.toISOString() })
            .eq('id', user.id);
        } catch {
          /* ignore */
        }
      }

      try {
        await supabase.rpc('calculate_user_metrics', { user_uuid: user.id });
      } catch (e) {
        /* metrics RPC is best-effort */
      }

      clearSkipAgentWelcome();
      markTheaValueSeen();

      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['recipients', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['user-metrics', user.id] });

      toast({
        title: "You're all set",
        description: toCreate.length
          ? `${toCreate.length} ${toCreate.length === 1 ? 'person' : 'people'} added. I'll start watching for gift moments.`
          : "Welcome to Unwrapt. I'll take it from here.",
      });

      void trackProductEvent('onboarding_completed', {
        people_count: selectedPeople.length,
        import_method: people.some((person) => person.fromCalendar) ? 'calendar' : 'manual',
        skipped_guardrails: true,
      });
      void trackProductEvent('onboarding_completed_to_inbox', {
        people_count: selectedPeople.length,
      });

      if (destination === 'checkout') {
        void trackProductEvent('onboarding_subscription_checkout_started', {
          people_count: selectedPeople.length,
        });
        const response = await supabase.functions.invoke('create-subscription-checkout', {
          body: { priceId: VIP_MONTHLY_PRICE_ID, planType: 'vip_monthly' },
        });
        if (response.error) throw response.error;
        if (!response.data?.url) throw new Error('No checkout URL returned');
        window.location.href = response.data.url;
        return;
      }

      setTimeout(async () => {
        await onComplete();
        setCompleting(false);
      }, 900);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: 'Something went wrong',
        description: 'There was a problem finishing setup. Please try again.',
        variant: 'destructive',
      });
      setCompleting(false);
      setStartingCheckout(false);
    }
  };

  // ── Loading / completing splash ───────────────────────────────────────────────
  if (completing) {
    return (
      <MobileShell glow animate={false}>
        <div className="flex h-full flex-col items-center justify-center text-center">
          <TheaCharacter size="large" speaking={false} />
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
    // ════════ WELCOME ════════
    case 'welcome':
      return (
        <MobileShell
          glow
          contentClassName="px-7 pt-16 pb-4 flex flex-col justify-between"
          footer={
            <>
              <PrimaryButton onClick={() => setScreen('import')}>Get started</PrimaryButton>
              <p className="mt-3.5 text-center font-mono" style={{ fontSize: 12.5, color: U.muted, letterSpacing: '0.5px' }}>
                about 2 minutes · cancel anytime
              </p>
            </>
          }
        >
          <div className="flex items-center justify-between">
            <span className="font-display" style={{ fontSize: 23, letterSpacing: '-0.3px' }}>Unwrapt</span>
            <Eyebrow>Concierge</Eyebrow>
          </div>
          <div className="flex flex-1 flex-col justify-center pt-4 text-center">
            <TheaCharacter size="large" />
            <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ color: U.accent }}>
              Hi, I’m Thea, your gifting agent
            </p>
            <Display className="mt-3" style={{ fontSize: 40, lineHeight: 1.02, letterSpacing: '-0.03em' }}>
              Never forget another<br />
              <em style={{ fontStyle: 'italic', fontWeight: 400, color: U.accent }}>moment.</em>
            </Display>
            <p className="mx-auto mt-4" style={{ fontSize: 15, lineHeight: 1.5, color: U.textSecondary, maxWidth: 320 }}>
              I remember who matters, learn what they love and help you handle every gift.
            </p>
          </div>
        </MobileShell>
      );

    // ════════ IMPORT / SCANNING ════════
    case 'import':
      if (scanning) {
        return (
          <MobileShell animate={false}>
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <TheaCharacter size="large" />
              <Display className="mt-7 text-[27px]">Reading your calendar…</Display>
              <p className="mt-2" style={{ fontSize: 15, color: U.subtle, maxWidth: 260, lineHeight: 1.5 }}>
                Finding the people who matter and the dates that count.
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
        <MobileShell
          contentClassName="px-5 pt-5 pb-4"
          footer={
            <>
              <PrimaryButton onClick={handleFindMyPeople} disabled={connecting}>
                {connecting ? 'Connecting…' : 'Connect Google Calendar'}
              </PrimaryButton>
              <button
                type="button"
                onClick={startManualAdd}
                className="mt-2 min-h-11 w-full text-[13.5px] font-semibold"
                style={{ color: U.textSecondary }}
              >
                Add someone manually
              </button>
            </>
          }
        >
          <Eyebrow className="mb-1 text-center">Step 1 of 4</Eyebrow>
          <TheaCharacter size="large" />
          <div className="-mt-2 rounded-[22px] border bg-white/80 px-5 py-4 text-center" style={{ borderColor: U.border }}>
            <Display style={{ fontSize: 28, lineHeight: 1.08 }}>Who should I remember?</Display>
            <p className="mt-2 text-[14px] leading-5" style={{ color: U.textSecondary }}>
              I can find upcoming birthdays and anniversaries from your calendar, or we can start with one person.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2" style={{ color: U.muted, fontSize: 12 }}>
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Read-only access. Disconnect whenever.</span>
          </div>
        </MobileShell>
      );

    // ════════ FOUND PEOPLE ════════
    case 'found': {
      const selectedCount = selectedPeople.length;
      const selectedPerson = selectedPeople[0];
      const selectedFirst = firstNameOf(selectedPerson?.name || 'them');
      return (
        <MobileShell
          contentClassName="px-5 pt-5 pb-4"
          footer={
            <PrimaryButton onClick={focusSelectedPerson} disabled={selectedCount === 0 || !!focusingId}>
              {focusingId ? `Starting with ${selectedFirst}…` : `Continue with ${selectedFirst}`}
            </PrimaryButton>
          }
        >
          <Eyebrow className="text-center">Step 2 of 4</Eyebrow>
          <TheaCharacter size="medium" />
          <div className="-mt-2 mb-4 rounded-[22px] border bg-white/80 px-5 py-4 text-center" style={{ borderColor: U.border }} aria-live="polite">
            <Display style={{ fontSize: 27, lineHeight: 1.1 }}>
              {focusingId
                ? `Let’s start with ${selectedFirst}.`
                : <>I found <span style={{ color: U.accent }}>{people.length} {people.length === 1 ? 'person' : 'people'}</span> in your calendar.</>}
            </Display>
            <p className="mt-2 text-[13.5px] leading-5" style={{ color: U.textSecondary }}>
              {focusingId
                ? `${selectedPerson ? formatDateLabel(selectedPerson) : 'Their occasion'} is coming up. Tell me what they love and I’ll take it from there.`
                : `${selectedFirst} has the soonest occasion. Choose one person to start with. Selecting someone else will replace your choice.`}
            </p>
          </div>
          <Eyebrow className="mb-3" color={U.subtle}>Choose one person</Eyebrow>
          <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Choose one person to start with">
            {people.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => selectPerson(p.id)}
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
            <button
              type="button"
              onClick={startManualAdd}
              disabled={!!focusingId}
              className="flex w-full cursor-pointer items-center gap-3.5 text-left"
              style={{ padding: '13px 14px', borderRadius: 18, border: '1px dashed rgba(42,37,32,0.18)', color: U.muted, opacity: focusingId ? 0.3 : 1, transition: 'opacity 500ms ease' }}
            >
              <div className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: '50%', border: '1px dashed rgba(42,37,32,0.2)', fontSize: 22, color: U.accent }}>+</div>
              <div className="flex-1" style={{ fontSize: 14 }}>Add someone manually</div>
            </button>
          </div>
        </MobileShell>
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
          <TheaCharacter size="compact" />
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
      const available = INTEREST_TAXONOMY.filter((t) => !intelFacts.includes(t)).slice(0, 9);
      const canBuild = intelFacts.length >= 2;
      const interestLimitReached = intelFacts.length >= MAX_INTERESTS;
      return (
        <MobileShell
          contentClassName="flex flex-col px-0 pt-0"
          animate
        >
          <div className="flex h-full flex-col">
            {/* header */}
            <div className="relative text-center" style={{ padding: '16px 20px 14px', borderBottom: `1px solid rgba(42,37,32,0.07)` }}>
              <button type="button" aria-label="Back to people" onClick={() => setScreen(people.length > 1 || activePerson?.fromCalendar ? 'found' : 'import')} className="absolute left-4 top-5 flex min-h-11 min-w-11 items-center text-[22px]" style={{ color: U.subtle }}>‹</button>
              <TheaCharacter size="compact" className="mx-auto" />
              <div className="-mt-1">
                <div style={{ fontWeight: 600, fontSize: 15.5 }}>Getting to know {first}</div>
                <Eyebrow>Thea · {intelFacts.length}/{MAX_INTERESTS} interests</Eyebrow>
              </div>
            </div>
            {/* messages */}
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto" style={{ padding: '20px 20px 8px' }}>
              {intelMessages.map((m, i) => (
                <div key={i} className="flex" style={{ justifyContent: m.from === 'thea' ? 'flex-start' : 'flex-end' }}>
                  <div
                    style={{
                      maxWidth: '80%', padding: '13px 16px', borderRadius: 20, fontSize: 15, lineHeight: 1.45,
                      background: m.from === 'thea' ? U.surface : U.ink,
                      color: m.from === 'thea' ? U.ink : U.buttonText,
                      border: m.from === 'thea' ? `1px solid ${U.border}` : `1px solid ${U.ink}`,
                      borderBottomLeftRadius: m.from === 'thea' ? 6 : 20,
                      borderBottomRightRadius: m.from === 'thea' ? 20 : 6,
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            {/* chips + build */}
            <div style={{ padding: '8px 16px 0' }}>
              <div className="mb-3 flex flex-wrap gap-2">
                {available.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => addInterest(c)}
                    disabled={interestLimitReached}
                    className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ padding: '9px 14px', borderRadius: 14, background: U.chip, border: `1px solid rgba(42,37,32,0.1)`, fontSize: 13.5, fontWeight: 500, color: '#5A5147' }}
                  >
                    + {c}
                  </button>
                ))}
              </div>
              {canBuild && (
                <button
                  onClick={() => setScreen('recommendations')}
                  className="u-btn-primary animate-u-pop mb-3"
                  style={{ fontSize: 16, padding: 16 }}
                >
                  Show me gift ideas
                </button>
              )}
            </div>
            {/* input (visual) */}
            <div style={{ padding: '0 16px 34px' }}>
              <div className="flex items-center gap-2.5" style={{ padding: '7px 7px 7px 18px', borderRadius: 24, background: U.surface, border: `1px solid rgba(42,37,32,0.1)` }}>
                <input
                  value={intelInput}
                  disabled={interestLimitReached}
                  placeholder={interestLimitReached ? 'Three interests selected' : `Add something about ${first}`}
                  className="flex-1"
                  style={{ border: 'none', background: 'transparent', fontSize: 14.5, color: U.ink }}
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
                  aria-label="Add interest"
                  onClick={submitInterest}
                  disabled={!intelInput.trim() || interestLimitReached}
                  className="flex items-center justify-center disabled:opacity-40"
                  style={{ width: 38, height: 38, borderRadius: '50%', background: U.ink, color: U.buttonText, fontSize: 17, flexShrink: 0 }}
                >
                  ↑
                </button>
              </div>
            </div>
          </div>
        </MobileShell>
      );
    }

    // ════════ VALUE PREVIEW (catalog-backed recommendations) — emotional peak → inbox ════════
    case 'recommendations': {
      if (!activePerson) return null;
      const first = firstNameOf(activePerson.name);
      const otherCount = Math.max(0, selectedPeople.length - 1);
      return (
        <MobileShell
          contentClassName="px-[22px] pt-14 pb-4"
          footer={
            <>
              <PrimaryButton onClick={() => setScreen('subscription')}>
                Automate gifting for {first}{otherCount ? ` + ${otherCount} ${otherCount === 1 ? 'other' : 'others'}` : ''}
              </PrimaryButton>
              <p className="mt-3 text-center font-mono" style={{ fontSize: 12, color: U.muted, letterSpacing: '0.4px' }}>
                See what Thea can take off your plate
              </p>
            </>
          }
        >
          <button
            type="button"
            aria-label="Back to interests"
            onClick={() => enterIntel(activePerson.id)}
            className="mb-3.5"
            style={{ fontSize: 22, color: U.subtle }}
          >
            ‹
          </button>
          <div className="mb-2 flex items-center gap-2.5">
            <Eyebrow>Personalized for {first}</Eyebrow>
          </div>
          <TheaCharacter size="medium" />
          <Display style={{ fontSize: 31, lineHeight: 1.08 }}>This is where their interests can lead.</Display>
          <p className="mb-5 mt-2.5" style={{ fontSize: 15, lineHeight: 1.5, color: U.textSecondary }}>
            Live catalog ideas from what you shared. This is the magic — Thea gets sharper every time you talk.
          </p>
          <GiftRecommendationPreview recipientFirstName={first} interests={activePerson.interests} />
        </MobileShell>
      );
    }

    // ════════ SUBSCRIPTION VALUE ════════
    case 'subscription': {
      if (!activePerson) return null;
      const first = firstNameOf(activePerson.name);
      const peopleCount = selectedPeople.length;
      const annualHours = Math.max(6, peopleCount * 3);
      const benefits = [
        { icon: Clock3, title: `Estimated ${annualHours}+ hours back`, body: 'Thea remembers dates, searches the catalog and keeps gifting moving.' },
        { icon: Gift, title: 'Curated gift options', body: `Recommendations shaped by what ${first} and the people you love actually enjoy.` },
        { icon: CalendarDays, title: 'Occasions watched for you', body: 'Birthdays and anniversaries stay visible before they become last-minute emergencies.' },
        { icon: ShieldCheck, title: 'You stay in control', body: 'Review the recommendation and approve before any gift is purchased.' },
      ];
      const personas = [
        { label: 'Busy professional', text: 'Keeps meaningful relationships covered between packed workweeks.' },
        { label: 'Busy parent', text: 'Moves birthdays and family occasions out of the mental-load pile.' },
        { label: 'Proud grandparent', text: 'Keeps every grandchild’s interests and important dates in one place.' },
      ];

      return (
        <MobileShell
          contentClassName="px-5 pt-8 pb-6"
          footer={
            <>
              <PrimaryButton onClick={() => completeOnboarding('checkout')} disabled={completing}>
                Start automating · {VIP_MONTHLY_AMOUNT_LABEL}/month
              </PrimaryButton>
              <button
                type="button"
                onClick={() => completeOnboarding('dashboard')}
                disabled={completing}
                className="mt-2 min-h-11 w-full text-[13px] font-semibold"
                style={{ color: U.textSecondary }}
              >
                Not now, go to my gift inbox
              </button>
            </>
          }
        >
          <button
            type="button"
            aria-label="Back to gift ideas"
            onClick={() => setScreen('recommendations')}
            className="mb-3 min-h-11 min-w-11 text-left text-[24px]"
            style={{ color: U.subtle }}
          >
            ‹
          </button>

          <div className="flex items-center justify-center gap-2.5">
            <Eyebrow color={U.accent}>Thea membership</Eyebrow>
          </div>
          <TheaCharacter size="compact" />
          <Display className="mt-4 text-[32px]">Put gifting for {peopleCount} {peopleCount === 1 ? 'person' : 'people'} on autopilot.</Display>
          <p className="mt-3 text-[15px] leading-6" style={{ color: U.textSecondary }}>
            Thea turns the dates and interests you shared into thoughtful options, timely approvals and fewer last-minute scrambles.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {benefits.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-[18px] border bg-white p-3.5" style={{ borderColor: U.border }}>
                <Icon size={18} color={U.accent} aria-hidden="true" />
                <h3 className="mt-3 text-[13px] font-semibold leading-4">{title}</h3>
                <p className="mt-1.5 text-[11.5px] leading-[17px]" style={{ color: U.textSecondary }}>{body}</p>
              </article>
            ))}
          </div>

          <section className="mt-5 rounded-[20px] p-4" style={{ background: U.ink, color: U.buttonText }}>
            <div className="flex items-center gap-2">
              <Sparkles size={17} color={U.accent} aria-hidden="true" />
              <h3 className="text-[14px] font-semibold">Meet Thea, your gifting agent</h3>
            </div>
            <p className="mt-2 text-[12.5px] leading-5" style={{ color: '#D8CFC1' }}>
              Ask for ideas anytime. Thea learns from your feedback, watches upcoming occasions and brings you a recommendation when it is time to act.
            </p>
          </section>

          <section className="mt-6">
            <Eyebrow className="mb-3">Made for real life</Eyebrow>
            <div className="flex snap-x gap-2.5 overflow-x-auto pb-2">
              {personas.map((persona) => (
                <article key={persona.label} className="w-[78%] shrink-0 snap-start rounded-[18px] border bg-white p-4" style={{ borderColor: U.border }}>
                  <div className="flex items-center gap-2">
                    <Check size={15} color={U.sage} aria-hidden="true" />
                    <h3 className="text-[12.5px] font-semibold">{persona.label}</h3>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-5" style={{ color: U.textSecondary }}>{persona.text}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="mt-4 flex items-center justify-center gap-2 text-[11.5px]" style={{ color: U.muted }}>
            <Users size={14} aria-hidden="true" />
            Cancel anytime · secure checkout
          </div>
          <p className="mt-2 text-center text-[10.5px] leading-4" style={{ color: U.muted }}>
            Time estimate assumes about 3 hours of planning and shopping per person each year.
          </p>
        </MobileShell>
      );
    }

    default:
      return null;
  }
};

export default AgentOnboardingFlow;

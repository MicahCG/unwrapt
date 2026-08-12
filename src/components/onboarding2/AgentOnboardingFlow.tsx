import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeRecipientName } from '@/lib/dateUtils';
import { MobileShell, Eyebrow, PrimaryButton, Display } from '@/components/unwrapt2/MobileShell';
import { TheaAvatar, PersonAvatar } from '@/components/unwrapt2/TheaAvatar';
import { U, toneForIndex, initialsOf } from '@/components/unwrapt2/theme';
import { format } from 'date-fns';
import { trackProductEvent } from '@/lib/productAnalytics';
import GiftRecommendationPreview from '@/components/onboarding2/GiftRecommendationPreview';

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

type Screen = 'welcome' | 'import' | 'found' | 'addperson' | 'intel' | 'recommendations' | 'summary' | 'guardrails' | 'trial';

const FREE_TIER_LIMIT = 3;
const MAX_INTERESTS = 3;

const INTEREST_TAXONOMY = [
  'Golf', 'Travel', 'Coffee', 'Fitness', 'Cooking', 'Wine', 'Reading', 'Music',
  'Fashion', 'Gaming', 'Art', 'Pets', 'Tech', 'Outdoors', 'Whiskey', 'Premium experiences',
];

const INTEREST_REPLIES: Record<string, (n: string) => string> = {
  Golf: (n) => `Golf noted. I'll lean toward course-day gear and experiences ${n} will actually use.`,
  Travel: (n) => `A traveller. I'll favour things that pack well and earn a spot in ${n}'s carry-on.`,
  Whiskey: () => `Whiskey it is. I'll keep an eye out for tastings and a really good pour.`,
  'Premium experiences': () => `Premium experiences. I'll watch for moments worth giving, not just objects.`,
};

const REL_OPTIONS = ['Friend', 'Family', 'Partner', 'Colleague', 'Mentor'];

const RANGE_PRESETS = [
  { id: 'budget', label: 'Budget-friendly', range: '$15–50', lo: 15, hi: 50 },
  { id: 'everyday', label: 'Everyday', range: '$50–150', lo: 50, hi: 150 },
  { id: 'generous', label: 'Generous', range: '$150–350', lo: 150, hi: 350 },
  { id: 'luxury', label: 'Luxury', range: '$350+', lo: 350, hi: 600 },
];

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
  // Pre-select only the first FREE_TIER_LIMIT people; the rest stay off by
  // default so users opt in rather than having to deselect everyone.
  return Array.from(map.values()).map((p, i) => ({ ...p, selected: i < FREE_TIER_LIMIT }));
}

function formatDateLabel(p: Person): string {
  if (!p.primaryDate) return p.relationship || 'No date yet';
  try {
    return format(new Date(p.primaryDate), 'MMM d');
  } catch {
    return p.primaryDate;
  }
}

const AgentOnboardingFlow: React.FC<AgentOnboardingFlowProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [screen, setScreen] = useState<Screen>('welcome');
  const [scanning, setScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Intel chat state
  const [intelMessages, setIntelMessages] = useState<{ from: 'thea' | 'user'; text: string }[]>([]);
  const [intelFacts, setIntelFacts] = useState<string[]>([]);
  const [intelInput, setIntelInput] = useState('');

  // Guardrails
  const [budget, setBudget] = useState({ lo: 50, hi: 150 });
  const [autopilot] = useState('always');

  // Manual add-person draft
  const [draft, setDraft] = useState({ name: '', relationship: 'Friend', date: '' });

  const [completing, setCompleting] = useState(false);

  const selectedPeople = useMemo(() => people.filter((p) => p.selected), [people]);
  const activePerson = useMemo(() => people.find((p) => p.id === activeId) || null, [people, activeId]);

  useEffect(() => {
    void trackProductEvent('onboarding_step_viewed', { step: screen });
  }, [screen]);

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
  const togglePerson = (id: string) => {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));
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
    setPeople((prev) => [...prev, person]);
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
    const reply = INTEREST_REPLIES[interest]?.(first) || `${interest} noted. I'll fold that into ${first}'s gifts.`;
    setTimeout(() => {
      setIntelMessages((m) => [...m, { from: 'thea', text: reply }]);
    }, 550);
  };

  const submitInterest = () => {
    addInterest(intelInput);
    setIntelInput('');
  };

  // ── Completion: create recipients (preserves original Supabase logic) ─────────
  const completeOnboarding = async () => {
    if (!user?.id) return;
    setCompleting(true);
    try {
      const chosen = people.filter((p) => p.selected);

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

      // Persist gifting preferences best-effort (ignore if columns are absent).
      try {
        await supabase
          .from('profiles')
          .update({
            default_gift_budget_min: budget.lo,
            default_gift_budget_max: budget.hi,
            autopilot_level: autopilot,
          } as never)
          .eq('id', user.id);
      } catch (e) {
        /* preference columns may not exist yet — non-fatal */
      }

      try {
        await supabase.rpc('calculate_user_metrics', { user_uuid: user.id });
      } catch (e) {
        /* metrics RPC is best-effort */
      }

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
      });

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
    }
  };

  // ── Loading / completing splash ───────────────────────────────────────────────
  if (completing) {
    return (
      <MobileShell glow animate={false}>
        <div className="flex h-full flex-col items-center justify-center text-center">
          <TheaAvatar size={66} pulse />
          <Display className="mt-7 text-[27px]">Setting up your concierge…</Display>
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
          <div className="mt-auto pt-16">
            <div className="mb-6 flex items-center gap-3">
              <TheaAvatar size={34} />
              <span style={{ fontSize: 13.5, color: U.subtle }}>Hi, I'm Thea, your personal gifting agent</span>
            </div>
            <Display style={{ fontSize: 47, lineHeight: 1.02, letterSpacing: '-0.03em' }}>
              Never forget<br />another<br />
              <em style={{ fontStyle: 'italic', fontWeight: 400, color: U.accent }}>moment.</em>
            </Display>
            <p className="mt-5" style={{ fontSize: 17, lineHeight: 1.55, color: U.textSecondary, maxWidth: 300 }}>
              I remember the people who matter, learn what they love, and quietly handle the perfect gift, so you
              never have to stress again.
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
              <TheaAvatar size={66} pulse />
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
          footer={
            <>
              <PrimaryButton onClick={handleFindMyPeople} disabled={connecting}>
                {connecting ? 'Connecting…' : 'Find my people'}
              </PrimaryButton>
              <p onClick={startManualAdd} className="mt-3.5 cursor-pointer text-center" style={{ fontSize: 13.5, color: U.subtle }}>
                or add someone manually
              </p>
            </>
          }
        >
          <Eyebrow className="mb-3.5">Step 1 of 4</Eyebrow>
          <Display style={{ fontSize: 32, lineHeight: 1.08 }}>Connect your world</Display>
          <p className="mb-6 mt-2.5" style={{ fontSize: 15, lineHeight: 1.5, color: U.textSecondary }}>
            I'll quietly find birthdays, anniversaries and the people behind them. Your data stays yours.
          </p>
          <button
            type="button"
            onClick={handleFindMyPeople}
            disabled={connecting}
            className="flex w-full items-center gap-3.5 text-left disabled:opacity-60"
            style={{ padding: 15, borderRadius: 18, background: U.surface, border: `1px solid ${U.border}` }}
          >
            <div
              className="flex items-center justify-center"
              style={{ width: 38, height: 38, borderRadius: 11, background: '#EAE0CC', flexShrink: 0, fontFamily: "'Newsreader', serif", fontSize: 19, color: U.slate }}
            >
              G
            </div>
            <div className="flex-1">
              <div style={{ fontWeight: 600, fontSize: 15.5 }}>Google Calendar</div>
              <div style={{ fontSize: 12.5, color: U.muted }}>Birthdays and anniversaries</div>
            </div>
            {isConnected ? (
              <div className="flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: '50%', background: U.sage, color: U.cream, fontSize: 14 }}>✓</div>
            ) : (
              <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: '1px', color: U.accent }}>Connect</span>
            )}
          </button>
          <div className="mt-3" style={{ padding: '11px 13px', borderRadius: 14, background: U.chip }}>
            <p className="text-[12.5px] leading-5" style={{ color: U.textSecondary }}>
              Google Contacts is next. For now, add anyone missing from your calendar manually.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-2" style={{ color: U.muted, fontSize: 12.5 }}>
            <span style={{ fontSize: 14 }}>⏿</span>
            <span>Encrypted. Never sold or shared. Disconnect whenever.</span>
          </div>
        </MobileShell>
      );

    // ════════ FOUND PEOPLE ════════
    case 'found': {
      const selectedCount = selectedPeople.length;
      const overLimit = selectedCount > FREE_TIER_LIMIT;
      return (
        <MobileShell
          footer={
            <PrimaryButton onClick={() => enterIntel()} disabled={selectedCount === 0}>
              Continue with {selectedCount} {selectedCount === 1 ? 'person' : 'people'}
            </PrimaryButton>
          }
        >
          <div className="mb-4 flex items-center gap-2.5">
            <TheaAvatar size={30} />
            <Eyebrow>Step 2 of 4</Eyebrow>
          </div>
          <Display style={{ fontSize: 31, lineHeight: 1.1 }}>
            I found <span style={{ color: U.accent }}>{people.length} {people.length === 1 ? 'person' : 'people'}</span> who seem to matter to you.
          </Display>
          <p className="mb-4 mt-2.5" style={{ fontSize: 15, lineHeight: 1.5, color: U.textSecondary }}>
            Keep the ones I should look after. You can always add or remove people later.
          </p>
          <Eyebrow className="mb-3" color={U.subtle}>{selectedCount} selected</Eyebrow>
          {overLimit && (
            <div className="mb-3 flex items-center gap-2.5" style={{ padding: '11px 13px', borderRadius: 13, background: U.accentSoft, border: '1px solid rgba(182,91,60,0.25)' }}>
              <span style={{ fontSize: 14 }}>✦</span>
              <div className="flex-1" style={{ fontSize: 12.5, color: '#5A5147' }}>
                Your free plan covers <strong>{FREE_TIER_LIMIT} people</strong>. Upgrade to look after everyone.
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            {people.map((p) => (
              <div
                key={p.id}
                onClick={() => togglePerson(p.id)}
                className="flex cursor-pointer items-center gap-3.5"
                style={{ padding: '13px 14px', borderRadius: 18, background: U.surface, border: `1px solid ${U.border}` }}
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
              </div>
            ))}
            <div
              onClick={startManualAdd}
              className="flex cursor-pointer items-center gap-3.5"
              style={{ padding: '13px 14px', borderRadius: 18, border: '1px dashed rgba(42,37,32,0.18)', color: U.muted }}
            >
              <div className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: '50%', border: '1px dashed rgba(42,37,32,0.2)', fontSize: 22, color: U.accent }}>+</div>
              <div className="flex-1" style={{ fontSize: 14 }}>Add someone manually</div>
            </div>
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
            <div onClick={() => setScreen(people.length ? 'found' : 'import')} className="cursor-pointer" style={{ fontSize: 22, color: U.subtle, width: 24 }}>‹</div>
            <TheaAvatar size={34} />
            <div className="flex-1">
              <div style={{ fontWeight: 600, fontSize: 15.5 }}>Add someone</div>
              <Eyebrow>Thea</Eyebrow>
            </div>
          </div>
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
            <div className="flex items-center gap-3" style={{ padding: '56px 20px 14px', borderBottom: `1px solid rgba(42,37,32,0.07)` }}>
              <div onClick={() => setScreen(people.length > 1 || activePerson?.fromCalendar ? 'found' : 'import')} className="cursor-pointer" style={{ fontSize: 22, color: U.subtle, width: 26 }}>‹</div>
              <TheaAvatar size={38} />
              <div className="flex-1">
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

    // ════════ VALUE PREVIEW (catalog-backed recommendations) ════════
    case 'recommendations': {
      if (!activePerson) return null;
      const first = firstNameOf(activePerson.name);
      return (
        <MobileShell
          contentClassName="px-[22px] pt-14 pb-4"
          footer={<PrimaryButton onClick={() => setScreen('summary')}>Save {first}'s taste profile</PrimaryButton>}
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
            <TheaAvatar size={28} />
            <Eyebrow>Personalized for {first}</Eyebrow>
          </div>
          <Display style={{ fontSize: 31, lineHeight: 1.08 }}>This is where their interests can lead.</Display>
          <p className="mb-5 mt-2.5" style={{ fontSize: 15, lineHeight: 1.5, color: U.textSecondary }}>
            These are live catalog examples I would consider from what you shared. The final recommendation gets sharper as I learn more.
          </p>
          <GiftRecommendationPreview recipientFirstName={first} interests={activePerson.interests} />
        </MobileShell>
      );
    }

    // ════════ SUMMARY (living profile) ════════
    case 'summary': {
      if (!activePerson) return null;
      const first = firstNameOf(activePerson.name);
      const interests = activePerson.interests;
      const strength = Math.min(4, 1 + interests.length);
      return (
        <MobileShell
          contentClassName="px-[22px] pt-14 pb-4"
          footer={
            <>
              <PrimaryButton onClick={() => setScreen('guardrails')}>Looks right, continue</PrimaryButton>
              <p onClick={() => enterIntel(activePerson.id)} className="mt-3 cursor-pointer text-center" style={{ fontSize: 13.5, color: U.subtle }}>Edit details</p>
            </>
          }
        >
          <div onClick={() => enterIntel(activePerson.id)} className="mb-3.5 cursor-pointer" style={{ fontSize: 22, color: U.subtle }}>‹</div>
          <div className="mb-2 flex items-center gap-2.5">
            <TheaAvatar size={26} />
            <span style={{ fontSize: 13.5, color: U.subtle }}>Here's how I understand {first}</span>
          </div>
          <Display style={{ fontSize: 30, lineHeight: 1.1 }}>A living profile<br />that gets sharper.</Display>

          <div className="mb-3.5 mt-4" style={{ background: U.surface, border: `1px solid ${U.border}`, borderRadius: 22, padding: 18 }}>
            <div className="mb-4 flex items-center gap-3.5">
              <PersonAvatar initials={initialsOf(activePerson.name)} tone={activePerson.tone} size={52} />
              <div className="flex-1">
                <div className="font-display" style={{ fontSize: 21, letterSpacing: '-0.3px' }}>{activePerson.name}</div>
                <div style={{ fontSize: 13, color: U.muted }}>{activePerson.relationship || 'Someone special'}</div>
              </div>
            </div>
            {(activePerson.primaryDate) && (
              <div className="flex items-center gap-2 font-mono uppercase" style={{ padding: '11px 13px', borderRadius: 13, background: U.chip, fontSize: 11, letterSpacing: '1px', color: U.accent }}>
                🎂 {activePerson.primaryType || 'Date'} · {formatDateLabel(activePerson)}
              </div>
            )}
          </div>

          {interests.length > 0 && (
            <div className="mb-4">
              <Eyebrow className="mb-2.5">Interests</Eyebrow>
              <div className="flex flex-wrap gap-1.5">
                {interests.map((i) => (
                  <span key={i} style={{ padding: '7px 13px', borderRadius: 13, background: U.chip, fontSize: 13.5, fontWeight: 500 }}>{i}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <Eyebrow className="mb-2">Gift style</Eyebrow>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: '#5A5147' }}>
              Specific over generic. Quality over quantity. {first} would rather have one thing they'll actually use
              than a clever gimmick.
            </p>
          </div>

          <div className="mb-1.5 flex items-center gap-2.5" style={{ padding: '13px 15px', borderRadius: 15, background: U.chip }}>
            <Eyebrow color={U.subtle}>Profile strength</Eyebrow>
            <div className="flex flex-1 items-center gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ width: 22, height: 6, borderRadius: 3, background: i < strength ? U.accent : 'rgba(42,37,32,0.13)' }} />
              ))}
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: U.accent }}>{strength >= 3 ? 'Strong' : strength === 2 ? 'Good' : 'Growing'}</span>
          </div>
        </MobileShell>
      );
    }

    // ════════ GUARDRAILS (budget + autopilot) ════════
    case 'guardrails': {
      const budgetLabel = `$${budget.lo} – $${budget.hi}`;
      return (
        <MobileShell
          contentClassName="px-[22px] pt-14 pb-4"
          footer={<PrimaryButton onClick={() => setScreen('trial')}>Turn on Unwrapt</PrimaryButton>}
        >
          <div onClick={() => setScreen('summary')} className="mb-3.5 cursor-pointer" style={{ fontSize: 22, color: U.subtle }}>‹</div>
          <Eyebrow className="mb-3">Step 4 of 4 · Trust &amp; budget</Eyebrow>
          <Display style={{ fontSize: 31, lineHeight: 1.08 }}>Set your guardrails</Display>
          <p className="mb-5 mt-2.5" style={{ fontSize: 15, lineHeight: 1.5, color: U.textSecondary }}>
            What you'd usually spend, and how much I can handle on my own. Fine-tune any of it later in Settings.
          </p>

          <Eyebrow className="mb-2.5">Typical gift range</Eyebrow>
          <div className="mb-2.5 text-center" style={{ background: U.surface, border: `1px solid ${U.border}`, borderRadius: 20, padding: '15px 18px' }}>
            <span className="font-display" style={{ fontSize: 30, letterSpacing: '-0.5px' }}>{budgetLabel}</span>
            <div style={{ fontSize: 12, color: U.muted, marginTop: 1 }}>per gift, on average</div>
          </div>
          <div className="mb-5 flex flex-wrap gap-2">
            {RANGE_PRESETS.map((r) => {
              const sel = budget.lo === r.lo && budget.hi === r.hi;
              return (
                <div
                  key={r.id}
                  onClick={() => setBudget({ lo: r.lo, hi: r.hi })}
                  className="flex cursor-pointer items-baseline"
                  style={{ padding: '10px 13px', borderRadius: 14, background: sel ? '#F1E7D5' : U.surface, border: sel ? `1.5px solid ${U.ink}` : '1px solid rgba(42,37,32,0.12)' }}
                >
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r.label}</span>
                  <span className="font-mono" style={{ fontSize: 11, opacity: 0.65, marginLeft: 6 }}>{r.range}</span>
                </div>
              );
            })}
          </div>

          <Eyebrow className="mb-3">Your approval preference</Eyebrow>
          <div
            className="flex items-start gap-3.5"
            style={{
              padding: 16,
              borderRadius: 18,
              background: '#F1E7D5',
              border: `1.5px solid ${U.ink}`,
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                flexShrink: 0,
                background: U.ink,
                color: U.buttonText,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ✓
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15.5 }}>Always ask before purchase</div>
              <div style={{ fontSize: 13, color: U.muted, marginTop: 2, lineHeight: 1.4 }}>
                Thea recommends the gift and explains why it fits. Nothing is purchased
                until you approve the item and total.
              </div>
            </div>
          </div>
          <div className="mt-4.5 flex gap-2.5" style={{ padding: 14, borderRadius: 16, background: U.chip, marginTop: 18 }}>
            <span style={{ fontSize: 16 }}>🕊</span>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#5A5147' }}>
              You'll always see what I'm doing before it happens. And you only ever pay the real gift price.{' '}
              <strong>no markups, no hidden fees.</strong>
            </p>
          </div>
        </MobileShell>
      );
    }

    // ════════ FREE PLAN CONFIRMATION ════════
    case 'trial':
      return (
        <MobileShell
          contentClassName="px-6 pt-14 pb-4"
          footer={
            <>
              <PrimaryButton onClick={completeOnboarding}>Finish setup</PrimaryButton>
              <p className="mt-3 text-center font-mono" style={{ fontSize: 12, color: U.muted, letterSpacing: '0.4px' }}>
                No card required · approve every gift before purchase
              </p>
            </>
          }
        >
          <div onClick={() => setScreen('guardrails')} className="mb-3.5 cursor-pointer" style={{ fontSize: 22, color: U.subtle }}>‹</div>
          <Eyebrow className="mb-3">Ready when you are</Eyebrow>
          <Display style={{ fontSize: 31, lineHeight: 1.08 }}>Your concierge is set up</Display>
          <p className="mb-5 mt-2.5" style={{ fontSize: 15, lineHeight: 1.5, color: U.textSecondary }}>
            Thea will watch the moments you added and bring you a recommendation when
            there is something worth giving. <strong>You stay in control of every purchase.</strong>
          </p>
          <div className="mb-3.5" style={{ background: U.surface, border: `1px solid ${U.border}`, borderRadius: 20, padding: '4px 16px' }}>
            <div className="flex items-center justify-between gap-3" style={{ padding: '15px 0', borderBottom: '1px solid rgba(42,37,32,0.07)' }}>
              <Eyebrow>People</Eyebrow>
              <span style={{ fontSize: 14.5, fontWeight: 600 }}>{selectedPeople.length} selected</span>
            </div>
            <div className="flex items-center justify-between gap-3" style={{ padding: '15px 0', borderBottom: '1px solid rgba(42,37,32,0.07)' }}>
              <Eyebrow>Budget</Eyebrow>
              <span style={{ fontSize: 14.5, fontWeight: 600 }}>${budget.lo}–${budget.hi} per gift</span>
            </div>
            <div className="flex items-center justify-between gap-3" style={{ padding: '15px 0' }}>
              <Eyebrow>Approval</Eyebrow>
              <span style={{ fontSize: 14.5, fontWeight: 600 }}>Always ask first</span>
            </div>
          </div>
          <div className="mb-3.5" style={{ background: U.chip, borderRadius: 18, padding: '16px 18px' }}>
            <Eyebrow className="mb-2.5" color={U.subtle}>Included in your free plan</Eyebrow>
            <div className="flex flex-col gap-2.5" style={{ fontSize: 13.5, color: '#5A5147' }}>
              <div className="flex gap-2.5"><span style={{ color: U.sage }}>✓</span><span>Up to {FREE_TIER_LIMIT} people, fully looked after</span></div>
              <div className="flex gap-2.5"><span style={{ color: U.sage }}>✓</span><span>Thoughtful recommendations &amp; occasion reminders</span></div>
              <div className="flex gap-2.5"><span style={{ color: U.muted }}>✦</span><span>Upgrade anytime for unlimited people and priority recommendations</span></div>
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ color: U.muted, fontSize: 12 }}>
            <span>⏿</span><span>Your preferences can be changed anytime in Settings.</span>
          </div>
        </MobileShell>
      );

    default:
      return null;
  }
};

export default AgentOnboardingFlow;

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MonthlyOpportunitiesOverlay from '@/components/MonthlyOpportunitiesOverlay';
import GiftScheduledSuccess from '@/components/GiftScheduledSuccess';
import { toast } from '@/hooks/use-toast';
import AddRecipientModal from '@/components/AddRecipientModal';
import ScheduleGiftModal from '@/components/ScheduleGiftModal';
import EditRecipientModal from '@/components/EditRecipientModal';
import { AddFundsModal } from '@/components/wallet/AddFundsModal';
import { VIPUpgradeModal } from '@/components/subscription/VIPUpgradeModal';
import { VIPWelcomeModal } from '@/components/onboarding/VIPWelcomeModal';
import { AutomationToggle, EnableAutomationModal, AutomationDetailModal } from '@/components/automation';
import { MobileShell, Eyebrow, PrimaryButton, Display } from '@/components/unwrapt2/MobileShell';
import { MargotAvatar, PersonAvatar } from '@/components/unwrapt2/MargotAvatar';
import { ApprovalScreen } from '@/components/unwrapt2/ApprovalScreen';
import { U, toneForIndex, initialsOf } from '@/components/unwrapt2/theme';
import { cleanName } from '@/lib/utils';
import { getNextOccurrence, formatOccasionDate, getDaysUntil, getDaysUntilExact } from '@/lib/dateUtils';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showMonthlyOpportunities, setShowMonthlyOpportunities] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successRecipient, setSuccessRecipient] = useState(null);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [showScheduleGift, setShowScheduleGift] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showEnableAutomation, setShowEnableAutomation] = useState(false);
  const [automationRecipient, setAutomationRecipient] = useState<any>(null);
  const [showVIPOnboarding, setShowVIPOnboarding] = useState(false);
  const [previousTier, setPreviousTier] = useState<string | null>(null);
  const [showEditRecipient, setShowEditRecipient] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<any>(null);
  const [showAutomationDetail, setShowAutomationDetail] = useState(false);
  const [detailRecipient, setDetailRecipient] = useState<any>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [approval, setApproval] = useState<{ gift: any; recipient: any } | null>(null);

  // Direct Stripe checkout for VIP upgrade
  const handleDirectUpgrade = async () => {
    if (!user) return;
    setIsUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { priceId: 'vip_monthly' },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({ title: 'Error', description: 'Failed to start checkout. Please try again.', variant: 'destructive' });
      setIsUpgrading(false);
    }
  };

  // Fetch user profile with subscription info and wallet balance
  const { data: userProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier, trial_ends_at, gift_wallet_balance')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Real-time wallet balance updates
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('wallet-balance-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => {
        refetchProfile();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetchProfile]);

  // Trigger VIP onboarding when user upgrades from free to VIP
  useEffect(() => {
    if (!userProfile?.subscription_tier) return;
    const currentTier = userProfile.subscription_tier;
    if (currentTier === 'vip' && previousTier !== null && previousTier !== 'vip') {
      setShowVIPOnboarding(true);
    }
    setPreviousTier(currentTier);
  }, [userProfile?.subscription_tier, previousTier]);

  // Fetch recipients with their upcoming occasions
  const { data: recipients = [] } = useQuery({
    queryKey: ['recipients', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('recipients')
        .select(`*, scheduled_gifts(*)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Check for recently scheduled gift to show success animation
  const { data: recentGift } = useQuery({
    queryKey: ['recent-gift', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const giftSuccess = sessionStorage.getItem('giftScheduledSuccess');
      if (!giftSuccess) return null;
      const { recipientId, timestamp } = JSON.parse(giftSuccess);
      if (Date.now() - timestamp > 30000) {
        sessionStorage.removeItem('giftScheduledSuccess');
        return null;
      }
      const { data: recipient, error } = await supabase
        .from('recipients')
        .select(`*, scheduled_gifts:scheduled_gifts(id, gift_description, status, created_at)`)
        .eq('id', recipientId)
        .eq('user_id', user.id)
        .single();
      if (error || !recipient) {
        sessionStorage.removeItem('giftScheduledSuccess');
        return null;
      }
      const recentScheduledGift = recipient.scheduled_gifts
        ?.filter((gift) => gift.created_at)
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())?.[0];
      return { ...recipient, recentGift: recentScheduledGift };
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    const today = new Date().toDateString();
    const opportunitiesShownDate = localStorage.getItem('opportunitiesShownDate');
    if (opportunitiesShownDate !== today) {
      setShowMonthlyOpportunities(true);
      localStorage.setItem('opportunitiesShownDate', today);
    }
  }, []);

  useEffect(() => {
    if (recentGift && !showMonthlyOpportunities) {
      setSuccessRecipient(recentGift);
      setShowSuccessAnimation(true);
    }
  }, [recentGift, showMonthlyOpportunities]);

  const handleMonthlyOpportunitiesComplete = () => setShowMonthlyOpportunities(false);
  const handleSuccessComplete = () => {
    setShowSuccessAnimation(false);
    setSuccessRecipient(null);
    sessionStorage.removeItem('giftScheduledSuccess');
  };

  const handleScheduleGift = (recipient: any) => {
    setSelectedRecipient(recipient);
    setShowScheduleGift(true);
  };
  const handleEnableAutomation = (recipient: any) => {
    setAutomationRecipient(recipient);
    setShowEnableAutomation(true);
  };
  const handleDisableAutomation = async (recipientId: string) => {
    if (!user) return;
    try {
      await supabase.from('scheduled_gifts').update({ automation_enabled: false }).eq('recipient_id', recipientId).eq('user_id', user.id);
      window.location.reload();
    } catch (error) {
      console.error('Error disabling automation:', error);
    }
  };

  // Sort recipients by next upcoming birthday/anniversary
  const sortedRecipients = useMemo(() => {
    return [...recipients].sort((a, b) => {
      const aDateString = a.birthday || a.anniversary;
      const bDateString = b.birthday || b.anniversary;
      if (!aDateString && !bDateString) return 0;
      if (!aDateString) return 1;
      if (!bDateString) return -1;
      return getNextOccurrence(aDateString).getTime() - getNextOccurrence(bDateString).getTime();
    });
  }, [recipients]);

  // Derive concierge inbox state from loaded data.
  const giftNeedsReview = (g: any) => g?.wallet_reserved && !g?.fulfilled_at && g?.status !== 'ordered' && g?.status !== 'delivered';

  const needsReview = useMemo(() => {
    const out: { gift: any; recipient: any }[] = [];
    recipients.forEach((r: any) => (r.scheduled_gifts || []).forEach((g: any) => {
      if (giftNeedsReview(g)) out.push({ gift: g, recipient: r });
    }));
    return out;
  }, [recipients]);

  const inMotionCount = useMemo(() => {
    let n = 0;
    recipients.forEach((r: any) => (r.scheduled_gifts || []).forEach((g: any) => {
      if (g.status === 'ordered') n++;
    }));
    return n;
  }, [recipients]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();
  const displayName = (user?.user_metadata?.full_name || user?.email || 'there').split(' ')[0].split('@')[0];
  const tier = (userProfile?.subscription_tier as 'free' | 'vip') || 'free';
  const planLabel = tier === 'vip' ? 'VIP' : (userProfile?.trial_ends_at ? 'Free trial' : 'Free');
  const isFree = tier === 'free';

  const heroRecipient = sortedRecipients[0];
  const heroNextDate = heroRecipient ? (heroRecipient.birthday || heroRecipient.anniversary) : null;
  const heroDays = heroNextDate ? getDaysUntil(heroNextDate) : null;

  return (
    <>
      {showMonthlyOpportunities && <MonthlyOpportunitiesOverlay onComplete={handleMonthlyOpportunitiesComplete} />}
      {successRecipient && (
        <GiftScheduledSuccess recipient={successRecipient} onComplete={handleSuccessComplete} isVisible={showSuccessAnimation} />
      )}

      {approval && (
        <ApprovalScreen
          gift={approval.gift}
          recipient={approval.recipient}
          onClose={() => setApproval(null)}
          onApproved={() => setApproval(null)}
        />
      )}

      <MobileShell
        contentClassName="px-5 pt-12 pb-3"
        footer={
          <>
            <div className="mb-2.5 flex gap-2 overflow-x-auto">
              <div onClick={() => setShowAddRecipient(true)} className="flex-shrink-0 cursor-pointer whitespace-nowrap" style={{ padding: '9px 14px', borderRadius: 14, background: U.chip, border: '1px solid rgba(42,37,32,0.1)', fontSize: 13, fontWeight: 600, color: '#5A5147' }}>
                ＋ Add someone
              </div>
              <div onClick={() => navigate('/gift-history')} className="flex-shrink-0 cursor-pointer whitespace-nowrap" style={{ padding: '9px 14px', borderRadius: 14, background: U.chip, border: '1px solid rgba(42,37,32,0.1)', fontSize: 13, fontWeight: 600, color: '#5A5147' }}>
                ✦ Gift history
              </div>
            </div>
            <div className="flex items-center gap-2.5" style={{ padding: '7px 7px 7px 18px', borderRadius: 24, background: U.surface, border: '1px solid rgba(42,37,32,0.1)' }}>
              <input placeholder="Ask Margot anything…" className="flex-1" style={{ border: 'none', background: 'transparent', fontSize: 14.5, color: U.ink }} />
              <div className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: '50%', background: U.accent, color: U.buttonText, fontSize: 17, flexShrink: 0 }}>↑</div>
            </div>
          </>
        }
      >
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow className="mb-0.5">{greeting}, {displayName}</Eyebrow>
            <span className="font-display" style={{ fontSize: 27, letterSpacing: '-0.4px' }}>Your inbox</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: '1px', color: U.accent, border: '1px solid rgba(182,91,60,0.4)', padding: '3px 7px', borderRadius: 8 }}>{planLabel}</span>
            <div onClick={() => navigate('/settings')} className="flex cursor-pointer items-center justify-center" style={{ width: 34, height: 34, borderRadius: '50%', background: '#E5DBC6', fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 15, color: '#5A5147' }}>
              {initialsOf(displayName).charAt(0)}
            </div>
          </div>
        </div>

        {/* Margot status */}
        <div className="my-4 flex items-center gap-2.5" style={{ padding: '11px 14px', borderRadius: 14, background: U.chip }}>
          <MargotAvatar size={26} />
          <span style={{ fontSize: 13.5, color: '#5A5147' }}>
            <strong>Margot</strong> · {needsReview.length} {needsReview.length === 1 ? 'needs' : 'need'} you, {inMotionCount} in motion
          </span>
        </div>

        {/* Trial / activate banner */}
        {isFree && (
          <div onClick={() => setShowUpgradeModal(true)} className="mb-4 flex cursor-pointer items-center gap-2.5" style={{ padding: '12px 14px', borderRadius: 14, background: U.accentSoft, border: '1px solid rgba(182,91,60,0.25)' }}>
            <span style={{ fontSize: 15 }}>✦</span>
            <div className="flex-1" style={{ fontSize: 13, color: '#5A5147' }}>
              <strong>{userProfile?.trial_ends_at ? 'Free trial' : 'Activate Unwrapt'}</strong> · unlock unlimited people & full autopilot
            </div>
            <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: '1px', color: U.accent }}>Activate</span>
          </div>
        )}

        {/* People strip */}
        {sortedRecipients.length > 0 && (
          <div className="mb-4">
            <Eyebrow className="mb-2.5">Your people</Eyebrow>
            <div className="flex gap-3.5 overflow-x-auto pb-0.5">
              {sortedRecipients.map((p: any, i: number) => (
                <div key={p.id} onClick={() => handleScheduleGift(p)} className="flex flex-shrink-0 cursor-pointer flex-col items-center gap-1.5" style={{ width: 56 }}>
                  <PersonAvatar initials={initialsOf(cleanName(p.name))} tone={toneForIndex(i)} size={52} />
                  <span style={{ fontSize: 11.5, color: '#5A5147', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 56 }}>{cleanName(p.name).split(' ')[0]}</span>
                </div>
              ))}
              <div onClick={() => setShowAddRecipient(true)} className="flex flex-shrink-0 cursor-pointer flex-col items-center gap-1.5" style={{ width: 56 }}>
                <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: '50%', border: '1.5px dashed rgba(42,37,32,0.25)', color: U.accent, fontSize: 24 }}>+</div>
                <span style={{ fontSize: 11.5, color: U.muted }}>Add</span>
              </div>
            </div>
          </div>
        )}

        {/* Needs-you hero cards (gifts awaiting confirmation) */}
        {needsReview.map(({ gift, recipient }) => {
          const name = cleanName(recipient.name);
          const occ = gift.occasion_date || recipient.birthday || recipient.anniversary;
          const days = occ ? getDaysUntil(occ) : null;
          return (
            <div key={gift.id} className="mb-3.5" style={{ borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(182,91,60,0.25)', background: 'linear-gradient(180deg,#FBEFE5,#FAF6EE)' }}>
              <div className="flex items-center justify-between" style={{ padding: '18px 18px 0' }}>
                <Eyebrow color={U.accent}>{gift.occasion || 'Occasion'}{days != null ? ` · in ${days} days` : ''}</Eyebrow>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: U.accent }} />
              </div>
              <div className="flex items-center gap-3.5" style={{ padding: '10px 18px 0' }}>
                <PersonAvatar initials={initialsOf(name)} tone={U.accent} size={46} />
                <div>
                  <div className="font-display" style={{ fontSize: 19, letterSpacing: '-0.3px' }}>{name}'s gift is ready</div>
                  <div style={{ fontSize: 12.5, color: U.muted }}>{recipient.relationship || 'Someone special'}</div>
                </div>
              </div>
              <div style={{ padding: '14px 18px 4px' }}>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: '#5A5147' }}>
                  <em className="font-display" style={{ fontStyle: 'italic', color: U.ink }}>"I found something I think they'll love — it fits what you've told me."</em>
                </p>
              </div>
              <div className="flex items-center gap-3" style={{ padding: '14px 18px 18px' }}>
                <div className="flex flex-1 items-center gap-2.5" style={{ padding: 9, borderRadius: 13, background: '#fff', border: '1px solid rgba(42,37,32,0.07)' }}>
                  {gift.gift_image_url ? (
                    <img src={gift.gift_image_url} alt="" style={{ width: 42, height: 42, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 42, height: 42, borderRadius: 9, flexShrink: 0, background: 'repeating-linear-gradient(135deg,#E8DFCC,#E8DFCC 6px,#E0D5BD 6px,#E0D5BD 12px)' }} />
                  )}
                  <div className="min-w-0">
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{gift.gift_description || gift.gift_type || 'Curated gift'}</div>
                    <div className="font-mono" style={{ fontSize: 12, color: U.subtle }}>{gift.estimated_cost ? `$${Math.round(gift.estimated_cost)}` : (gift.price_range || '')}</div>
                  </div>
                </div>
                <button onClick={() => setApproval({ gift, recipient })} style={{ appearance: 'none', border: 'none', cursor: 'pointer', background: U.ink, color: U.buttonText, fontWeight: 600, fontSize: 14.5, padding: '14px 20px', borderRadius: 14, whiteSpace: 'nowrap' }}>
                  Review
                </button>
              </div>
            </div>
          );
        })}

        {/* Upcoming people list */}
        {sortedRecipients.length === 0 ? (
          <div className="mt-2" style={{ borderRadius: 22, border: `1px dashed rgba(42,37,32,0.18)`, padding: '28px 20px', textAlign: 'center' }}>
            <MargotAvatar size={40} className="mx-auto mb-3" />
            <Display style={{ fontSize: 21 }}>Let's find your people</Display>
            <p className="mx-auto mt-1.5" style={{ fontSize: 13.5, color: U.muted, maxWidth: 260, lineHeight: 1.5 }}>
              Add someone you care about and I'll watch for the moments that matter.
            </p>
            <div className="mt-4">
              <PrimaryButton onClick={() => setShowAddRecipient(true)}>Add someone</PrimaryButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <Eyebrow className="mb-0.5">Upcoming</Eyebrow>
            {sortedRecipients.map((recipient: any, index: number) => {
              const nextOccasionDate = recipient.birthday || recipient.anniversary;
              const occasionType = recipient.birthday ? 'Birthday' : 'Anniversary';
              const isLocked = isFree && index >= 3;
              const daysUntil = nextOccasionDate ? getDaysUntil(nextOccasionDate) : null;

              const activeOrder = recipient.scheduled_gifts?.find((gift: any) =>
                (gift.status === 'ordered' || gift.status === 'delivered') && gift.delivery_date);
              const deliveryDaysUntil = activeOrder?.delivery_date ? getDaysUntilExact(activeOrder.delivery_date) : null;

              const nextOccasionGiftDate = nextOccasionDate ? getNextOccurrence(nextOccasionDate) : null;
              const relevantAutomatedGift = recipient.scheduled_gifts
                ?.filter((g: any) => g.automation_enabled && g.occasion_date)
                ?.sort((a: any, b: any) => {
                  const aDiff = Math.abs(new Date(a.occasion_date).getTime() - (nextOccasionGiftDate?.getTime() || 0));
                  const bDiff = Math.abs(new Date(b.occasion_date).getTime() - (nextOccasionGiftDate?.getTime() || 0));
                  return aDiff - bDiff;
                })[0];

              if (isLocked) {
                return (
                  <div key={recipient.id} style={{ borderRadius: 18, border: `1px solid ${U.border}`, background: U.surface, padding: '16px 18px', filter: 'blur(3px)', pointerEvents: 'none' }}>
                    <div className="flex items-center gap-3">
                      <PersonAvatar initials={initialsOf(cleanName(recipient.name))} tone={toneForIndex(index)} size={38} />
                      <div><div style={{ fontWeight: 600, fontSize: 15 }}>{cleanName(recipient.name)}</div></div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={recipient.id} style={{ borderRadius: 20, border: `1px solid ${U.border}`, background: U.surface, padding: '16px 18px' }}>
                  <div className="flex cursor-pointer items-center justify-between" onClick={() => handleScheduleGift(recipient)}>
                    <div className="flex items-center gap-3">
                      <PersonAvatar initials={initialsOf(cleanName(recipient.name))} tone={toneForIndex(index)} size={38} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{cleanName(recipient.name)}</div>
                        {nextOccasionDate ? (
                          <div className="flex items-baseline gap-2" style={{ fontSize: 12.5, color: U.muted }}>
                            <span>{occasionType} · {formatOccasionDate(nextOccasionDate)}</span>
                            {daysUntil != null && <span>{daysUntil === 0 ? '· Today!' : daysUntil === 1 ? '· Tomorrow' : `· in ${daysUntil}d`}</span>}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12.5, color: U.muted }}>No date set</div>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 20, color: U.muted }}>›</span>
                  </div>

                  {/* Active order status */}
                  {activeOrder && (
                    <div className="mt-2.5 flex items-center gap-3 pt-2.5" style={{ borderTop: `1px solid ${U.border}` }}>
                      {activeOrder.gift_image_url && (
                        <img src={activeOrder.gift_image_url} alt="" style={{ width: 40, height: 40, borderRadius: 9, objectFit: 'cover' }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: U.sage }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: U.sage }}>
                            {activeOrder.status === 'delivered' ? 'Delivered' : 'On its way'}
                          </span>
                        </div>
                        {activeOrder.delivery_date && deliveryDaysUntil != null && (
                          <p style={{ margin: 0, fontSize: 12, color: U.muted }}>
                            {deliveryDaysUntil < 0 ? `Delivered ${formatOccasionDate(activeOrder.delivery_date)}` : deliveryDaysUntil === 0 ? 'Delivers today' : `Delivers ${formatOccasionDate(activeOrder.delivery_date)}`}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Automation toggle (VIP) — preserves existing logic */}
                  {nextOccasionDate && tier === 'vip' && (() => {
                    const activeOrderDate = activeOrder?.occasion_date;
                    const automatedGiftDate = relevantAutomatedGift?.occasion_date;
                    const isSameOccasion = activeOrderDate && automatedGiftDate &&
                      new Date(activeOrderDate).getTime() === new Date(automatedGiftDate).getTime();
                    if (activeOrder && isSameOccasion) return null;
                    return (
                      <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${U.border}` }} onClick={(e) => e.stopPropagation()}>
                        <AutomationToggle
                          recipientId={recipient.id}
                          recipientName={cleanName(recipient.name)}
                          estimatedCost={42.0}
                          onEnableAutomation={() => handleEnableAutomation(recipient)}
                          onDisableAutomation={() => handleDisableAutomation(recipient.id)}
                          onViewDetails={() => {
                            setDetailRecipient(recipient);
                            setShowAutomationDetail(true);
                          }}
                          tier={tier}
                          isEnabled={recipient.automation_enabled || recipient.scheduled_gifts?.some((g: any) => g.automation_enabled)}
                          hasCompleteAddress={!!(recipient.street && recipient.city && recipient.state && recipient.zip_code)}
                          hasGiftSelected={!!(recipient.default_gift_variant_id || recipient.preferred_gift_vibe)}
                          scheduledGift={relevantAutomatedGift}
                          walletBalance={userProfile?.gift_wallet_balance || 0}
                        />
                      </div>
                    );
                  })()}
                </div>
              );
            })}

            {/* Free-tier upgrade prompt */}
            {isFree && sortedRecipients.length > 3 && (
              <div style={{ borderRadius: 18, background: U.accentSoft, border: '1px solid rgba(182,91,60,0.25)', padding: '16px 18px', textAlign: 'center' }}>
                <Display style={{ fontSize: 19 }}>Look after everyone</Display>
                <p className="mx-auto mb-3 mt-1" style={{ fontSize: 13, color: '#5A5147', maxWidth: 280 }}>
                  Your free trial covers 3 people. Activate for unlimited people, luxury gifts & full autopilot.
                </p>
                <PrimaryButton onClick={handleDirectUpgrade} disabled={isUpgrading}>
                  {isUpgrading ? 'Redirecting…' : 'Activate Unwrapt'}
                </PrimaryButton>
              </div>
            )}

            {tier === 'vip' && (userProfile?.gift_wallet_balance != null) && (
              <div onClick={() => setShowAddFunds(true)} className="flex cursor-pointer items-center justify-between" style={{ borderRadius: 16, background: U.chip, padding: '13px 16px' }}>
                <span style={{ fontSize: 13, color: '#5A5147' }}>Gift wallet</span>
                <span className="font-mono" style={{ fontSize: 14, fontWeight: 500 }}>${(userProfile?.gift_wallet_balance || 0).toFixed(2)} · Add funds</span>
              </div>
            )}
          </div>
        )}
      </MobileShell>

      {/* Modals — unchanged logic */}
      {showAddRecipient && (
        <AddRecipientModal isOpen={showAddRecipient} onClose={() => setShowAddRecipient(false)} onRecipientAdded={() => setShowAddRecipient(false)} />
      )}
      {showScheduleGift && selectedRecipient && (
        <ScheduleGiftModal isOpen={showScheduleGift} onClose={() => setShowScheduleGift(false)} recipient={selectedRecipient} />
      )}
      {showAddFunds && userProfile && (
        <AddFundsModal isOpen={showAddFunds} onClose={() => setShowAddFunds(false)} currentBalance={userProfile.gift_wallet_balance || 0} />
      )}
      {showEditRecipient && editingRecipient && (
        <EditRecipientModal isOpen={showEditRecipient} onClose={() => { setShowEditRecipient(false); setEditingRecipient(null); }} recipient={editingRecipient} />
      )}
      <VIPUpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      <VIPWelcomeModal open={showVIPOnboarding} onComplete={() => { setShowVIPOnboarding(false); refetchProfile(); }} />
      {showEnableAutomation && automationRecipient && (
        <EnableAutomationModal
          open={showEnableAutomation}
          onOpenChange={setShowEnableAutomation}
          recipientId={automationRecipient.id}
          recipientName={cleanName(automationRecipient.name)}
          occasionType={automationRecipient.birthday ? 'birthday' : 'anniversary'}
          occasionDate={automationRecipient.birthday || automationRecipient.anniversary}
          currentGiftVibe={automationRecipient.preferred_gift_vibe}
          onSuccess={() => { setShowEnableAutomation(false); setAutomationRecipient(null); window.location.reload(); }}
        />
      )}
      {showAutomationDetail && detailRecipient && userProfile && (
        <AutomationDetailModal
          open={showAutomationDetail}
          onOpenChange={setShowAutomationDetail}
          recipient={detailRecipient}
          walletBalance={userProfile.gift_wallet_balance || 0}
          onEditAddress={() => { setEditingRecipient(detailRecipient); setShowEditRecipient(true); }}
          onEditGift={() => { setAutomationRecipient(detailRecipient); setShowEnableAutomation(true); }}
        />
      )}
    </>
  );
};

export default Dashboard;

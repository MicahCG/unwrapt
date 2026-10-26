import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { VIPWelcomeModal } from '@/components/onboarding/VIPWelcomeModal';
import { MobileShell } from '@/components/unwrapt2/MobileShell';
import { TheaAvatar } from '@/components/unwrapt2/TheaAvatar';
import { ApprovalScreen } from '@/components/unwrapt2/ApprovalScreen';
import { U } from '@/components/unwrapt2/theme';
import RecipientDetailSheet from '@/components/RecipientDetailSheet';
import CatalogPreviewSheet from '@/components/CatalogPreviewSheet';
import { type RecipientRecord, type GiftRecord } from '@/lib/giftStatus';
import { findResumableGift, resumeGiftPayment, hasCompleteShippingAddress } from '@/lib/giftPayment';
import TheaHomeTab from '@/components/dashboard/TheaHomeTab';
import ManualHomeTab from '@/components/dashboard/ManualHomeTab';
import AccountMenu from '@/components/dashboard/AccountMenu';
import { AUTOPILOT_THRESHOLDS, type BriefingItem } from '@/lib/dashboardBriefing';
import type { GiftCatalogItem } from '@/lib/giftCatalog';

type DashboardTab = 'thea' | 'manual';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMonthlyOpportunities, setShowMonthlyOpportunities] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successRecipient, setSuccessRecipient] = useState(null);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [showScheduleGift, setShowScheduleGift] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [resumingGiftId, setResumingGiftId] = useState<string | null>(null);
  // Held by id so the open sheet always shows the latest saved data.
  const [recipientDetailId, setRecipientDetailId] = useState<string | null>(null);
  const [catalogRecipient, setCatalogRecipient] = useState<RecipientRecord | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showVIPOnboarding, setShowVIPOnboarding] = useState(false);
  const [previousTier, setPreviousTier] = useState<string | null>(null);
  const [showEditRecipient, setShowEditRecipient] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<any>(null);
  const [approval, setApproval] = useState<{ gift: any; recipient: any } | null>(null);
  const [theaQueue, setTheaQueue] = useState<{ id: number; text: string } | null>(null);

  const tabParam = searchParams.get('tab');
  const activeTab: DashboardTab = tabParam === 'manual' ? 'manual' : 'thea';

  const setActiveTab = useCallback((tab: DashboardTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'thea') next.delete('tab');
      else next.set('tab', 'manual');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const { data: userProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier, trial_ends_at, gift_wallet_balance, autopilot_level')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

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

  useEffect(() => {
    if (!userProfile?.subscription_tier) return;
    const currentTier = userProfile.subscription_tier;
    if (currentTier === 'vip' && previousTier !== null && previousTier !== 'vip') {
      setShowVIPOnboarding(true);
    }
    setPreviousTier(currentTier);
  }, [userProfile?.subscription_tier, previousTier]);

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
    if (!recipients.length) return;
    const today = new Date().toDateString();
    const opportunitiesShownDate = localStorage.getItem('opportunitiesShownDate');
    if (opportunitiesShownDate !== today) {
      setShowMonthlyOpportunities(true);
      localStorage.setItem('opportunitiesShownDate', today);
    }
  }, [recipients.length]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add-person') {
      setShowAddRecipient(true);
      setActiveTab('manual');
    }
    if (action === 'catalog') {
      setShowCatalog(true);
      setActiveTab('manual');
    }
    if (action) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('action');
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams, setActiveTab]);

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

  const resumeOrCollectAddress = async (gift: GiftRecord, recipient: RecipientRecord) => {
    if (!hasCompleteShippingAddress(recipient)) {
      setSelectedRecipient(recipient);
      setResumingGiftId(gift.id || null);
      setShowScheduleGift(true);
      return;
    }
    try {
      const url = await resumeGiftPayment(gift, recipient);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to resume gift payment:', error);
      toast({
        title: 'Payment error',
        description: 'Could not resume payment for this gift. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleScheduleGift = (recipient: RecipientRecord) => {
    setRecipientDetailId(null);
    const resumable = findResumableGift(recipient);
    if (resumable) {
      void resumeOrCollectAddress(resumable, recipient);
      return;
    }
    setSelectedRecipient(recipient);
    setShowScheduleGift(true);
  };

  const handleResumeGift = (gift: GiftRecord, recipient: RecipientRecord) => {
    setRecipientDetailId(null);
    void resumeOrCollectAddress(gift, recipient);
  };

  useEffect(() => {
    const handleProceedWithPayment = async (event: Event) => {
      const detail = (event as CustomEvent<{ giftId: string }>).detail;
      if (!detail?.giftId) return;
      try {
        const { data: gift, error } = await supabase
          .from('scheduled_gifts')
          .select('*, recipients(*)')
          .eq('id', detail.giftId)
          .single();
        if (error || !gift) throw error || new Error('Gift not found');
        const { recipients: recipient, ...giftFields } = gift as typeof gift & { recipients: RecipientRecord };
        const url = await resumeGiftPayment(giftFields, recipient);
        window.location.href = url;
      } catch (error) {
        console.error('Failed to resume gift payment:', error);
        toast({
          title: 'Payment error',
          description: 'Could not resume payment for this gift. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setResumingGiftId(null);
      }
    };

    window.addEventListener('proceedWithPayment', handleProceedWithPayment);
    return () => window.removeEventListener('proceedWithPayment', handleProceedWithPayment);
  }, []);

  const handleOpenRecipient = (recipient: RecipientRecord) => {
    setRecipientDetailId(recipient.id);
  };

  const handleOpenRecipientById = (recipientId: string, intent?: BriefingItem['action']) => {
    const recipient = (recipients as RecipientRecord[]).find((r) => r.id === recipientId);
    if (!recipient) return;

    if (intent === 'review') {
      const gift = (recipient.scheduled_gifts || []).find(
        (g) => g?.wallet_reserved && !g?.fulfilled_at && g?.status !== 'ordered' && g?.status !== 'delivered',
      );
      if (gift) {
        setApproval({ gift, recipient });
        return;
      }
    }

    if (intent === 'payment') {
      const resumable = findResumableGift(recipient);
      if (resumable) {
        void resumeOrCollectAddress(resumable, recipient);
        return;
      }
    }

    if (intent === 'address') {
      // The edit form opens over whichever tab is active, so Thea's conversation stays put.
      setEditingRecipient(recipient);
      setShowEditRecipient(true);
      return;
    }
    if (intent === 'interests') setActiveTab('manual');

    setRecipientDetailId(recipient.id);
  };

  const handleBrowseCatalog = (recipient?: RecipientRecord) => {
    setRecipientDetailId(null);
    setCatalogRecipient(recipient || null);
    setShowCatalog(true);
  };

  // A gift picked in the catalog goes to Thea, who builds the review to confirm.
  const handleCatalogSelect = (product: GiftCatalogItem) => {
    setShowCatalog(false);
    setActiveTab('thea');
    const forWhom = catalogRecipient ? ` for ${catalogRecipient.name}` : '';
    setTheaQueue({ id: Date.now(), text: `I'd like the ${product.name} (product ${product.id})${forWhom}.` });
  };

  const handleEditRecipient = (recipient: RecipientRecord) => {
    setRecipientDetailId(null);
    setEditingRecipient(recipient);
    setShowEditRecipient(true);
  };

  const displayName = (user?.user_metadata?.full_name || user?.email || 'there').split(' ')[0].split('@')[0];
  const tier = (userProfile?.subscription_tier as 'free' | 'vip') || 'free';
  const planLabel = tier === 'vip' ? 'VIP' : (userProfile?.trial_ends_at ? 'Free trial' : 'Free');

  const typedRecipients = recipients as RecipientRecord[];
  const recipientDetail = useMemo(
    () => typedRecipients.find((r) => r.id === recipientDetailId) || null,
    [typedRecipients, recipientDetailId],
  );
  const autopilotThreshold = AUTOPILOT_THRESHOLDS[(userProfile as any)?.autopilot_level] ?? AUTOPILOT_THRESHOLDS.ask100;

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
        contentClassName={`flex min-h-0 flex-col px-5 pt-10 pb-2 ${activeTab === 'thea' ? 'overflow-hidden' : 'overflow-y-auto'}`}
        footer={
          <nav
            aria-label="Dashboard tabs"
            className="grid grid-cols-2 items-center gap-1.5 rounded-[22px] border p-1.5 shadow-[0_12px_30px_rgba(42,37,32,0.08)] backdrop-blur"
            style={{ borderColor: '#D9CDBD', background: 'rgba(250,246,238,0.95)' }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('thea')}
              aria-current={activeTab === 'thea' ? 'page' : undefined}
              className="u-touch-card flex items-center justify-center gap-2 rounded-[16px] px-3 py-3 text-[13px] font-semibold"
              style={{
                background: activeTab === 'thea' ? U.ink : 'transparent',
                color: activeTab === 'thea' ? U.buttonText : '#5A5147',
              }}
            >
              <TheaAvatar size={28} />
              Thea
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              aria-current={activeTab === 'manual' ? 'page' : undefined}
              className="u-touch-card flex items-center justify-center gap-2 rounded-[16px] px-3 py-3 text-[13px] font-semibold"
              style={{
                background: activeTab === 'manual' ? U.ink : 'transparent',
                color: activeTab === 'manual' ? U.buttonText : '#5A5147',
              }}
            >
              <span aria-hidden="true" className="text-[15px]">▦</span>
              Manual
            </button>
          </nav>
        }
      >
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <div className="font-mono text-[9px] uppercase tracking-[1px]" style={{ color: U.accent, border: '1px solid rgba(182,91,60,0.4)', padding: '3px 7px', borderRadius: 8 }}>
            {planLabel}
          </div>
          <AccountMenu
            displayName={displayName}
            planLabel={planLabel}
            tier={tier}
            walletBalance={userProfile?.gift_wallet_balance}
            autopilotThreshold={autopilotThreshold}
            onAddFunds={() => setShowAddFunds(true)}
            onOpenSettings={() => navigate('/settings')}
          />
        </div>

        <div className="min-h-0 flex-1">
          {/* Both tabs stay mounted so switching never loses Thea's conversation or Manual's place. */}
          <div className={activeTab === 'thea' ? 'h-full' : 'hidden'}>
            <TheaHomeTab
              displayName={displayName}
              recipients={typedRecipients}
              autopilotThreshold={autopilotThreshold}
              onOpenRecipient={handleOpenRecipientById}
              onSwitchToManual={() => setActiveTab('manual')}
              queuedMessage={theaQueue}
            />
          </div>
          <div className={activeTab === 'manual' ? 'h-full' : 'hidden'}>
            <ManualHomeTab
              recipients={typedRecipients}
              autopilotThreshold={autopilotThreshold}
              onOpenRecipient={handleOpenRecipient}
              onAddRecipient={() => setShowAddRecipient(true)}
              onBrowseCatalog={() => handleBrowseCatalog()}
            />
          </div>
        </div>
      </MobileShell>

      {showAddRecipient && (
        <AddRecipientModal isOpen={showAddRecipient} onClose={() => setShowAddRecipient(false)} onRecipientAdded={() => setShowAddRecipient(false)} />
      )}
      {showScheduleGift && selectedRecipient && (
        <ScheduleGiftModal
          isOpen={showScheduleGift}
          onClose={() => { setShowScheduleGift(false); setResumingGiftId(null); }}
          recipient={selectedRecipient}
          payingForGiftId={resumingGiftId}
        />
      )}
      <RecipientDetailSheet
        recipient={recipientDetail}
        open={Boolean(recipientDetail)}
        onOpenChange={(open) => { if (!open) setRecipientDetailId(null); }}
        onSchedule={handleScheduleGift}
        onResumeGift={handleResumeGift}
        onEdit={handleEditRecipient}
        onBrowseCatalog={handleBrowseCatalog}
      />
      <CatalogPreviewSheet
        open={showCatalog}
        onOpenChange={setShowCatalog}
        recipientName={catalogRecipient?.name}
        interests={catalogRecipient?.interests || []}
        onSelect={handleCatalogSelect}
      />
      {showAddFunds && userProfile && (
        <AddFundsModal isOpen={showAddFunds} onClose={() => setShowAddFunds(false)} currentBalance={userProfile.gift_wallet_balance || 0} />
      )}
      {showEditRecipient && editingRecipient && (
        <EditRecipientModal isOpen={showEditRecipient} onClose={() => { setShowEditRecipient(false); setEditingRecipient(null); }} recipient={editingRecipient} />
      )}
      <VIPWelcomeModal open={showVIPOnboarding} onComplete={() => { setShowVIPOnboarding(false); refetchProfile(); }} />
    </>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import UserMenu from '@/components/auth/UserMenu';
import TestDataManager from '@/components/TestDataManager';
import MonthlyOpportunitiesOverlay from '@/components/MonthlyOpportunitiesOverlay';
import GiftScheduledSuccess from '@/components/GiftScheduledSuccess';
import { Logo } from '@/components/ui/logo';
import { Bell, Star, Heart, Plus, Lock, Crown, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddRecipientModal from '@/components/AddRecipientModal';
import ScheduleGiftModal from '@/components/ScheduleGiftModal';
import EditRecipientModal from '@/components/EditRecipientModal';
import SubscriptionBadge from '@/components/subscription/SubscriptionBadge';
import { WalletBalance } from '@/components/wallet/WalletBalance';
import { AddFundsModal } from '@/components/wallet/AddFundsModal';
import { TestTierToggle } from '@/components/dev/TestTierToggle';
import { TestWalletControls } from '@/components/dev/TestWalletControls';
import { VIPUpgradeModal } from '@/components/subscription/VIPUpgradeModal';
import { VIPWelcomeModal } from '@/components/onboarding/VIPWelcomeModal';
import { AutomationToggle, EnableAutomationModal, AutomationDetailModal } from '@/components/automation';
import { GiftsAwaitingConfirmation } from '@/components/GiftsAwaitingConfirmation';
import { format } from 'date-fns';
import { cleanName } from '@/lib/utils';
import { getNextOccurrence, formatOccasionDate, getDaysUntil, getDaysUntilExact } from '@/lib/dateUtils';

const Dashboard = () => {
  const { user } = useAuth();
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
    enabled: !!user?.id
  });

  // Subscribe to real-time wallet balance updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('wallet-balance-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          refetchProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetchProfile]);

  // Trigger VIP onboarding when user upgrades from free to VIP
  useEffect(() => {
    if (!userProfile?.subscription_tier) return;

    const currentTier = userProfile.subscription_tier;

    // Only show onboarding if:
    // 1. User just switched TO VIP (previousTier exists and was not VIP)
    if (currentTier === 'vip' &&
        previousTier !== null &&
        previousTier !== 'vip') {
      setShowVIPOnboarding(true);
    }

    setPreviousTier(currentTier);
  }, [userProfile?.subscription_tier, previousTier]);

  // Fetch recipients with their upcoming occasions
  const { data: recipients = [] } = useQuery({
    queryKey: ['recipients', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('📊 Dashboard: Fetching recipients for user:', user.id);
      
      const { data, error } = await supabase
        .from('recipients')
        .select(`
          *,
          scheduled_gifts(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Dashboard: Error fetching recipients:', error);
        throw error;
      }
      
      console.log(`✅ Dashboard: Fetched ${data?.length || 0} recipients`);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 0, // Always refetch to ensure fresh data
    refetchOnWindowFocus: true
  });


  // Check for recently scheduled gift to show success animation
  const { data: recentGift } = useQuery({
    queryKey: ['recent-gift', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const giftSuccess = sessionStorage.getItem('giftScheduledSuccess');
      if (!giftSuccess) return null;
      
      const { recipientId, timestamp } = JSON.parse(giftSuccess);
      const now = Date.now();
      if (now - timestamp > 30000) {
        sessionStorage.removeItem('giftScheduledSuccess');
        return null;
      }
      
      const { data: recipient, error } = await supabase
        .from('recipients')
        .select(`
          *,
          scheduled_gifts:scheduled_gifts(
            id,
            gift_description,
            status,
            created_at
          )
        `)
        .eq('id', recipientId)
        .eq('user_id', user.id)
        .single();
      
      if (error || !recipient) {
        sessionStorage.removeItem('giftScheduledSuccess');
        return null;
      }
      
      const recentScheduledGift = recipient.scheduled_gifts
        ?.filter(gift => gift.created_at)
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())?.[0];
      
      return {
        ...recipient,
        recentGift: recentScheduledGift
      };
    },
    enabled: !!user?.id
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

  const handleMonthlyOpportunitiesComplete = () => {
    setShowMonthlyOpportunities(false);
  };

  const handleSuccessComplete = () => {
    setShowSuccessAnimation(false);
    setSuccessRecipient(null);
    sessionStorage.removeItem('giftScheduledSuccess');
  };

  const getOccasionIcon = (occasion: string) => {
    if (occasion.toLowerCase().includes('birthday')) return <Bell className="w-5 h-5 text-[#D2B887]" />;
    if (occasion.toLowerCase().includes('anniversary')) return <Star className="w-5 h-5 text-[#D2B887]" />;
    return <Heart className="w-5 h-5 text-[#D2B887]" />;
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
      await supabase
        .from('scheduled_gifts')
        .update({ automation_enabled: false })
        .eq('recipient_id', recipientId)
        .eq('user_id', user.id);

      // Refetch recipients to update UI
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error('Error disabling automation:', error);
    }
  };

  // Sort recipients by next upcoming birthday/anniversary
  const sortedRecipients = [...recipients].sort((a, b) => {
    const aDateString = a.birthday || a.anniversary;
    const bDateString = b.birthday || b.anniversary;

    // Handle cases where one or both don't have dates
    if (!aDateString && !bDateString) return 0;
    if (!aDateString) return 1;
    if (!bDateString) return -1;

    // Get next occurrences using timezone-safe utility
    const aDate = getNextOccurrence(aDateString);
    const bDate = getNextOccurrence(bDateString);

    // Sort by earliest upcoming date
    const diff = aDate.getTime() - bDate.getTime();

    // Debug log for testing
    if (import.meta.env.DEV) {
      console.log('📅 Sorting:', {
        a: { name: a.name, date: aDateString, next: aDate.toLocaleDateString(), days: getDaysUntil(aDateString) },
        b: { name: b.name, date: bDateString, next: bDate.toLocaleDateString(), days: getDaysUntil(bDateString) },
        diff
      });
    }

    return diff;
  });

  // Log rendering info with current date context
  const today = new Date();
  console.log('📊 Dashboard: Rendering with', recipients.length, 'recipients.');
  console.log('📅 Current Date:', today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));
  console.log('👤 Tier:', userProfile?.subscription_tier || 'loading...');

  return (
    <>
      {showMonthlyOpportunities && (
        <MonthlyOpportunitiesOverlay onComplete={handleMonthlyOpportunitiesComplete} />
      )}
      
      {successRecipient && (
        <GiftScheduledSuccess
          recipient={successRecipient}
          onComplete={handleSuccessComplete}
          isVisible={showSuccessAnimation}
        />
      )}
      
      <div className="min-h-screen bg-[#FAF8F3]">
        {/* Header */}
        <header className="border-b border-[#E4DCD2] bg-[#FAF8F3]">
          <div className="px-12 py-6 flex items-center justify-between">
            <Logo size="lg" />
            <UserMenu />
          </div>
          <div className="px-12 pb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <h1 className="font-display text-2xl text-[#1A1A1A]">
                Your Unwrapt Concierge
              </h1>
              {userProfile && (
                <SubscriptionBadge 
                  tier={userProfile.subscription_tier as 'free' | 'vip'}
                  trialEndsAt={userProfile.trial_ends_at}
                />
              )}
            </div>
            <p className="text-[#1A1A1A]/70 text-sm">
              Here to help you prepare every upcoming gift with ease.
            </p>
          </div>
        </header>

        {/* Development Test Data Manager */}
        {process.env.NODE_ENV === 'development' && (
          <div className="px-12 pt-8">
            <TestDataManager />
          </div>
        )}

        {/* Admin Testing Controls */}
        <div className="px-12 pt-8 space-y-4">
          <TestTierToggle />
        </div>

        {/* Wallet Balance for VIP users */}
        {userProfile && (
          <div className="px-12 pt-8 space-y-6">
            <WalletBalance
              balance={userProfile.gift_wallet_balance || 0}
              onAddFunds={() => setShowAddFunds(true)}
              tier={userProfile.subscription_tier as 'free' | 'vip'}
            />
            <TestWalletControls
              currentBalance={userProfile.gift_wallet_balance || 0}
              onBalanceUpdated={() => refetchProfile()}
            />
          </div>
        )}

        {/* Gifts Awaiting Confirmation for VIP users */}
        {userProfile?.subscription_tier === 'vip' && (
          <div className="px-12 pt-6">
            <GiftsAwaitingConfirmation />
          </div>
        )}

        {/* Main Content - Centered when no scheduled gifts, two column when gifts exist */}
        <div className="px-12 py-12 flex justify-center">
          {/* Upcoming Birthdays */}
          <div className="space-y-6 w-full max-w-[620px]">
            <Card className="bg-[#EFE7DD] border-[#E4DCD2] rounded-2xl p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.07)]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl text-[#1A1A1A]">
                  Upcoming Birthdays
                </h2>
                {sortedRecipients.length > 0 && (
                  <Button
                    onClick={() => setShowAddRecipient(true)}
                    size="sm"
                    className="bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A] h-8 w-8 p-0 rounded-full"
                    title="Add New Recipient"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="relative space-y-4">
                {sortedRecipients.length === 0 ? (
                  <div className="text-center py-8 text-[#1A1A1A]/60">
                    <p className="mb-4">No recipients yet</p>
                    <Button
                      onClick={() => setShowAddRecipient(true)}
                      className="bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Recipient
                    </Button>
                  </div>
                ) : (
                  <>
                    {sortedRecipients.map((recipient, index) => {
                      const nextOccasionDate = recipient.birthday || recipient.anniversary;
                      const occasionType = recipient.birthday ? 'Birthday' : 'Anniversary';
                      const isFreeUser = userProfile?.subscription_tier === 'free';
                      const isLocked = isFreeUser && index >= 3;
                      const daysUntil = nextOccasionDate ? getDaysUntil(nextOccasionDate) : null;

                      // Find active order for this recipient
                      const activeOrder = recipient.scheduled_gifts?.find((gift: any) =>
                        (gift.status === 'ordered' || gift.status === 'delivered') &&
                        gift.delivery_date
                      );
                      const deliveryDaysUntil = activeOrder?.delivery_date ? getDaysUntilExact(activeOrder.delivery_date) : null;

                      // Find the most relevant automated gift for the NEXT upcoming occasion
                      // Priority: ordered > paid > reserved > pending
                      const nextOccasionGiftDate = nextOccasionDate ? getNextOccurrence(nextOccasionDate) : null;
                      const relevantAutomatedGift = recipient.scheduled_gifts
                        ?.filter((g: any) => g.automation_enabled && g.occasion_date)
                        ?.sort((a: any, b: any) => {
                          const aDate = new Date(a.occasion_date);
                          const bDate = new Date(b.occasion_date);
                          // Sort by closest to next occurrence
                          const aDiff = Math.abs(aDate.getTime() - (nextOccasionGiftDate?.getTime() || 0));
                          const bDiff = Math.abs(bDate.getTime() - (nextOccasionGiftDate?.getTime() || 0));
                          return aDiff - bDiff;
                        })[0];

                      return (
                        <div
                          key={recipient.id}
                          className={`p-4 bg-[#FAF8F3]/50 rounded-xl border border-[#E4DCD2] ${
                            isLocked ? 'blur-sm pointer-events-none' : 'hover:bg-[#FAF8F3]'
                          } transition-colors`}
                        >
                          <div
                            className="flex items-start justify-between cursor-pointer"
                            onClick={() => !isLocked && handleScheduleGift(recipient)}
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-[#D2B887]/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-[#1A1A1A] font-medium">
                                  {cleanName(recipient.name).charAt(0)}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-medium text-[#1A1A1A]">{cleanName(recipient.name)}</h3>
                                {nextOccasionDate ? (
                                  <div className="flex items-baseline gap-2 mt-0.5">
                                    <p className="text-base font-medium text-[#D2B887]">
                                      {formatOccasionDate(nextOccasionDate)}
                                    </p>
                                    {daysUntil !== null && (
                                      <span className="text-xs text-[#1A1A1A]/50">
                                        {daysUntil === 0 ? '• Today!' : daysUntil === 1 ? '• Tomorrow' : `• in ${daysUntil} days`}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-[#1A1A1A]/50">No date set</p>
                                )}

                                {/* Order Status - show if an order has been placed */}
                                {activeOrder && (
                                  <div className="mt-2 pt-2 border-t border-[#E4DCD2]/50">
                                    <div className="flex items-center gap-3">
                                      {/* Product Image */}
                                      {activeOrder.gift_image_url && (
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#FAF8F3] border border-[#E4DCD2] flex-shrink-0">
                                          <img
                                            src={activeOrder.gift_image_url}
                                            alt={activeOrder.gift_type || 'Gift'}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      )}

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <Truck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                          <span className="text-sm font-medium text-emerald-700">
                                            {activeOrder.status === 'delivered' ? 'Delivered' : 'Order Placed'}
                                          </span>
                                          {activeOrder.shopify_order_id && (
                                            <span className="text-xs text-[#1A1A1A]/40">
                                              #{activeOrder.shopify_order_id.slice(-6)}
                                            </span>
                                          )}
                                        </div>
                                        {activeOrder.gift_type && (
                                          <p className="text-xs text-[#1A1A1A]/70 mt-0.5 truncate">
                                            {activeOrder.gift_type}
                                          </p>
                                        )}
                                        {activeOrder.delivery_date && deliveryDaysUntil !== null && (
                                          <p className="text-xs text-[#1A1A1A]/60 mt-0.5">
                                            {deliveryDaysUntil < 0 
                                              ? `Delivered ${formatOccasionDate(activeOrder.delivery_date)}`
                                              : deliveryDaysUntil === 0 
                                                ? 'Delivers today'
                                                : `Delivers ${formatOccasionDate(activeOrder.delivery_date)} (in ${deliveryDaysUntil} ${deliveryDaysUntil === 1 ? 'day' : 'days'})`
                                            }
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            {nextOccasionDate && getOccasionIcon(occasionType)}
                          </div>

                          {/* Automation Toggle for VIP users */}
                          {!isLocked && nextOccasionDate && userProfile?.subscription_tier === 'vip' && (() => {
                            // If there's an active order and the relevant automated gift is for the SAME occasion, don't show duplicate status
                            const activeOrderDate = activeOrder?.occasion_date;
                            const automatedGiftDate = relevantAutomatedGift?.occasion_date;
                            const isSameOccasion = activeOrderDate && automatedGiftDate &&
                              new Date(activeOrderDate).getTime() === new Date(automatedGiftDate).getTime();

                            // Only show automation toggle if:
                            // 1. No active order exists, OR
                            // 2. The automated gift is for a different (future) occasion
                            if (activeOrder && isSameOccasion) {
                              return null;
                            }

                            return (
                              <div className="mt-3 pt-3 border-t border-[#E4DCD2]" onClick={(e) => e.stopPropagation()}>
                                <AutomationToggle
                                  recipientId={recipient.id}
                                  recipientName={cleanName(recipient.name)}
                                  estimatedCost={42.00}
                                  onEnableAutomation={() => handleEnableAutomation(recipient)}
                                  onDisableAutomation={() => handleDisableAutomation(recipient.id)}
                                  onViewDetails={() => {
                                    setDetailRecipient(recipient);
                                    setShowAutomationDetail(true);
                                  }}
                                  tier={userProfile.subscription_tier as 'free' | 'vip'}
                                  isEnabled={recipient.automation_enabled || recipient.scheduled_gifts?.some((g: any) => g.automation_enabled)}
                                  hasCompleteAddress={!!(recipient.street && recipient.city && recipient.state && recipient.zip_code)}
                                  hasGiftSelected={!!(recipient.default_gift_variant_id || recipient.preferred_gift_vibe)}
                                  scheduledGift={relevantAutomatedGift}
                                  walletBalance={userProfile.gift_wallet_balance || 0}
                                />
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                    
                    {/* Centered CTA overlay for blurred recipients (Free users only) */}
                    {userProfile?.subscription_tier === 'free' && sortedRecipients.length > 3 && (
                      <div
                        className="absolute left-0 right-0 flex items-start justify-center pointer-events-none z-20 pt-6"
                        style={{
                          top: `calc(${3 * 76}px + ${3 * 16}px)`, // Position at start of 4th recipient (after 3 visible ones)
                          height: `calc(${(sortedRecipients.length - 3) * 76}px + ${(sortedRecipients.length - 4) * 16}px)` // Height covering all blurred recipients
                        }}
                      >
                        <div className="bg-[#FAF8F3]/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-[#D2B887] pointer-events-auto max-w-sm">
                          <div className="text-center">
                            <Lock className="w-8 h-8 mx-auto mb-3 text-[#D2B887]" />
                            <h3 className="font-display text-xl text-[#1A1A1A] mb-2">
                              Upgrade to VIP
                            </h3>
                            <p className="text-sm text-[#1A1A1A]/70 mb-4 max-w-xs">
                              Unlock unlimited recipients and automation features
                            </p>
                            <Button
                              className="bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
                              onClick={() => setShowUpgradeModal(true)}
                            >
                              <Crown className="w-4 h-4 mr-2" />
                              Upgrade Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>

            {/* Add New Recipient Button */}
            {sortedRecipients.length > 0 && (
              <Button
                onClick={() => setShowAddRecipient(true)}
                variant="outline"
                className="w-full border-[#E4DCD2] bg-transparent hover:bg-[#EFE7DD] text-[#1A1A1A]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Recipient
              </Button>
            )}

            {/* Annual Gifting Plan */}
            <Card className="bg-[#EFE7DD] border-[#E4DCD2] rounded-2xl p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.07)]">
              <h2 className="font-display text-xl text-[#1A1A1A] mb-6">
                Your Annual Gifting Plan
              </h2>
              <div className="flex items-center justify-between py-4">
                <div className="flex-1 relative">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#D2B887]/30"></div>
                  <div className="relative flex justify-between">
                    {['Jan', 'Mar', 'Jun', 'Oct'].map((month, index) => (
                      <div key={month} className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-[#D2B887] mb-2"></div>
                        <span className="text-xs text-[#1A1A1A]/70">{month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </div>

      {/* Modals */}
      {showAddRecipient && (
        <AddRecipientModal
          isOpen={showAddRecipient}
          onClose={() => setShowAddRecipient(false)}
          onRecipientAdded={() => {
            setShowAddRecipient(false);
          }}
        />
      )}

      {showScheduleGift && selectedRecipient && (
        <ScheduleGiftModal
          isOpen={showScheduleGift}
          onClose={() => setShowScheduleGift(false)}
          recipient={selectedRecipient}
        />
      )}

      {showAddFunds && userProfile && (
        <AddFundsModal
          isOpen={showAddFunds}
          onClose={() => setShowAddFunds(false)}
          currentBalance={userProfile.gift_wallet_balance || 0}
        />
      )}

      {showEditRecipient && editingRecipient && (
        <EditRecipientModal
          isOpen={showEditRecipient}
          onClose={() => {
            setShowEditRecipient(false);
            setEditingRecipient(null);
          }}
          recipient={editingRecipient}
        />
      )}

      <VIPUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />

      <VIPWelcomeModal
        open={showVIPOnboarding}
        onComplete={() => {
          setShowVIPOnboarding(false);
          refetchProfile();
        }}
      />

      {showEnableAutomation && automationRecipient && (
        <EnableAutomationModal
          open={showEnableAutomation}
          onOpenChange={setShowEnableAutomation}
          recipientId={automationRecipient.id}
          recipientName={cleanName(automationRecipient.name)}
          occasionType={automationRecipient.birthday ? 'birthday' : 'anniversary'}
          occasionDate={automationRecipient.birthday || automationRecipient.anniversary}
          currentGiftVibe={automationRecipient.preferred_gift_vibe}
          onSuccess={() => {
            setShowEnableAutomation(false);
            setAutomationRecipient(null);
            window.location.reload();
          }}
        />
      )}

      {showAutomationDetail && detailRecipient && userProfile && (
        <AutomationDetailModal
          open={showAutomationDetail}
          onOpenChange={setShowAutomationDetail}
          recipient={detailRecipient}
          walletBalance={userProfile.gift_wallet_balance || 0}
          onEditAddress={() => {
            setEditingRecipient(detailRecipient);
            setShowEditRecipient(true);
          }}
          onEditGift={() => {
            setAutomationRecipient(detailRecipient);
            setShowEnableAutomation(true);
          }}
        />
      )}
    </>
  );
};

export default Dashboard;

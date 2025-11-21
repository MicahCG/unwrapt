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
import { Bell, Star, Heart, Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddRecipientModal from '@/components/AddRecipientModal';
import ScheduleGiftModal from '@/components/ScheduleGiftModal';
import GiftDetailsModal from '@/components/GiftDetailsModal';
import SubscriptionBadge from '@/components/subscription/SubscriptionBadge';
import { format } from 'date-fns';
import { cleanName } from '@/lib/utils';

const Dashboard = () => {
  const { user } = useAuth();
  const [showMonthlyOpportunities, setShowMonthlyOpportunities] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successRecipient, setSuccessRecipient] = useState(null);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [showScheduleGift, setShowScheduleGift] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [showGiftDetails, setShowGiftDetails] = useState(false);
  const [selectedGift, setSelectedGift] = useState(null);

  // Fetch user profile with subscription info
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier, trial_ends_at')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch recipients with their upcoming occasions
  const { data: recipients = [] } = useQuery({
    queryKey: ['dashboard-recipients', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('recipients')
        .select(`
          *,
          scheduled_gifts(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch pending gifts (unpaid)
  const { data: pendingGifts = [] } = useQuery({
    queryKey: ['pending-gifts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('scheduled_gifts')
        .select(`
          *,
          recipients(name, email)
        `)
        .eq('user_id', user.id)
        .eq('payment_status', 'unpaid')
        .order('occasion_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
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

  const handleViewGift = (gift: any) => {
    setSelectedGift(gift);
    setShowGiftDetails(true);
  };

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

        {/* Main Content - Two Column Layout */}
        <div className="px-12 py-12 grid grid-cols-1 xl:grid-cols-[620px_1fr] gap-8">
          {/* LEFT COLUMN - Recipients & Important Dates */}
          <div className="space-y-6">
            <Card className="bg-[#EFE7DD] border-[#E4DCD2] rounded-2xl p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.07)]">
              <h2 className="font-display text-xl text-[#1A1A1A] mb-6">
                Recipients & Important Dates
              </h2>
              
              <div className="space-y-4">
                {recipients.length === 0 ? (
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
                  recipients.map((recipient) => {
                    const nextOccasion = recipient.birthday || recipient.anniversary;
                    const occasionType = recipient.birthday ? 'Birthday' : 'Anniversary';
                    
                    return (
                      <div
                        key={recipient.id}
                        className="flex items-start justify-between p-4 bg-[#FAF8F3]/50 rounded-xl border border-[#E4DCD2] hover:bg-[#FAF8F3] transition-colors cursor-pointer"
                        onClick={() => handleScheduleGift(recipient)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#D2B887]/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-[#1A1A1A] font-medium">
                              {cleanName(recipient.name).charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium text-[#1A1A1A]">{cleanName(recipient.name)}</h3>
                            {nextOccasion && (
                              <p className="text-sm text-[#1A1A1A]/70">
                                {occasionType} — {format(new Date(nextOccasion), 'MMM d')}
                              </p>
                            )}
                          </div>
                        </div>
                        {nextOccasion && getOccasionIcon(occasionType)}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Add New Recipient Button */}
            {recipients.length > 0 && (
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

          {/* RIGHT COLUMN - Pending Gifts */}
          <div className="space-y-6">
            <Card className="bg-[#EFE7DD] border-[#E4DCD2] rounded-2xl p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.07)]">
              <h2 className="font-display text-xl text-[#1A1A1A] mb-6">
                Gifts Awaiting Confirmation
              </h2>
              
              <div className="space-y-4">
                {pendingGifts.length === 0 ? (
                  <div className="text-center py-12 text-[#1A1A1A]/60">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-40" />
                    <p>No pending gifts at the moment</p>
                    <p className="text-sm mt-2">Schedule a gift to get started</p>
                  </div>
                ) : (
                  pendingGifts.map((gift) => (
                    <div
                      key={gift.id}
                      className="p-5 bg-[#FAF8F3] rounded-xl border border-[#E4DCD2] hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-[#1A1A1A] mb-1">
                            {cleanName(gift.recipients?.name)}
                          </h3>
                          <p className="text-sm text-[#1A1A1A]/80">
                            {gift.gift_description || gift.gift_type}
                          </p>
                        </div>
                      </div>
                      
                      {gift.payment_amount && (
                        <p className="text-sm text-[#1A1A1A]/70 mb-4">
                          Price: ${gift.payment_amount.toFixed(2)}
                        </p>
                      )}
                      
                      <Button
                        onClick={() => handleViewGift(gift)}
                        className="w-full bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
                      >
                        Confirm Gift
                      </Button>
                    </div>
                  ))
                )}
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

      {showGiftDetails && selectedGift && (
        <GiftDetailsModal
          isOpen={showGiftDetails}
          onClose={() => setShowGiftDetails(false)}
          gift={selectedGift}
          onDelete={(giftId) => {
            setShowGiftDetails(false);
            setSelectedGift(null);
          }}
        />
      )}
    </>
  );
};

export default Dashboard;

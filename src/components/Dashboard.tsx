
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UserMenu from '@/components/auth/UserMenu';
import TestDataManager from '@/components/TestDataManager';
import UpcomingGiftsManager from '@/components/UpcomingGiftsManager';
import DashboardRecipients from '@/components/DashboardRecipients';
import WelcomeOverlay from '@/components/WelcomeOverlay';
import MonthlyOpportunitiesOverlay from '@/components/MonthlyOpportunitiesOverlay';
import GiftScheduledSuccess from '@/components/GiftScheduledSuccess';
import { Logo } from '@/components/ui/logo';
import { ResponsiveContainer, ResponsiveHeader, ResponsiveNavigation, ResponsiveActions } from '@/components/ui/responsive-container';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showMonthlyOpportunities, setShowMonthlyOpportunities] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successRecipient, setSuccessRecipient] = useState(null);

  // Check for recently scheduled gift to show success animation
  const { data: recentGift } = useQuery({
    queryKey: ['recent-gift', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Check if we have a success flag in sessionStorage
      const giftSuccess = sessionStorage.getItem('giftScheduledSuccess');
      if (!giftSuccess) return null;
      
      // Parse the stored data
      const { recipientId, timestamp } = JSON.parse(giftSuccess);
      
      // Only show animation if it's within the last 30 seconds
      const now = Date.now();
      if (now - timestamp > 30000) {
        sessionStorage.removeItem('giftScheduledSuccess');
        return null;
      }
      
      // Fetch the recipient data
      const { data: recipient, error } = await supabase
        .from('recipients')
        .select('*')
        .eq('id', recipientId)
        .eq('user_id', user.id)
        .single();
      
      if (error || !recipient) {
        sessionStorage.removeItem('giftScheduledSuccess');
        return null;
      }
      
      return recipient;
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    // Check if this is a new session
    const hasShownWelcome = sessionStorage.getItem('welcomeShown');
    console.log('Dashboard mounted, hasShownWelcome:', hasShownWelcome);
    
    if (!hasShownWelcome) {
      console.log('First time visit, showing welcome overlay');
      setShowWelcome(true);
      sessionStorage.setItem('welcomeShown', 'true');
    }
  }, []);

  useEffect(() => {
    // Show success animation if we have a recent gift and no other overlays are showing
    if (recentGift && !showWelcome && !showMonthlyOpportunities) {
      setSuccessRecipient(recentGift);
      setShowSuccessAnimation(true);
    }
  }, [recentGift, showWelcome, showMonthlyOpportunities]);

  const handleWelcomeComplete = () => {
    console.log('Welcome overlay completed, showing monthly opportunities');
    setShowWelcome(false);
    // Small delay to ensure smooth transition
    setTimeout(() => {
      setShowMonthlyOpportunities(true);
    }, 100);
  };

  const handleMonthlyOpportunitiesComplete = () => {
    console.log('Monthly opportunities overlay completed');
    setShowMonthlyOpportunities(false);
  };

  const handleSuccessComplete = () => {
    setShowSuccessAnimation(false);
    setSuccessRecipient(null);
    sessionStorage.removeItem('giftScheduledSuccess');
  };

  console.log('Dashboard render state:', { showWelcome, showMonthlyOpportunities, showSuccessAnimation });

  return (
    <>
      {showWelcome && (
        <WelcomeOverlay onComplete={handleWelcomeComplete} />
      )}
      
      {showMonthlyOpportunities && (
        <MonthlyOpportunitiesOverlay onComplete={handleMonthlyOpportunitiesComplete} />
      )}
      
      {/* Success Animation */}
      {successRecipient && (
        <GiftScheduledSuccess
          recipient={successRecipient}
          onComplete={handleSuccessComplete}
          isVisible={showSuccessAnimation}
        />
      )}
      
      <ResponsiveContainer>
      <ResponsiveHeader>
        <ResponsiveNavigation>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Logo size="lg" />
            </div>
          </div>
        </ResponsiveNavigation>

        <ResponsiveActions>
          <div className="flex items-center justify-end w-full">
            <UserMenu />
          </div>
        </ResponsiveActions>
      </ResponsiveHeader>

      {/* Development Test Data Manager */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6 sm:mb-8">
          <TestDataManager />
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        <div className="w-full order-1 xl:order-1">
          <DashboardRecipients />
        </div>
        <div className="w-full order-2 xl:order-2">
          <UpcomingGiftsManager />
        </div>
      </div>
    </ResponsiveContainer>
    </>
  );
};

export default Dashboard;

import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import UserMenu from '@/components/auth/UserMenu';
import TestDataManager from '@/components/TestDataManager';
import UpcomingGiftsManager from '@/components/UpcomingGiftsManager';
import DashboardRecipients from '@/components/DashboardRecipients';
import HolidayCarousel from '@/components/HolidayCarousel';
import AppNavigation from '@/components/AppNavigation';
import { ResponsiveContainer, ResponsiveHeader, ResponsiveNavigation, ResponsiveActions } from '@/components/ui/responsive-container';
import { Users, Gift, Clock, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  // Fetch user metrics
  const { data: metrics } = useQuery({
    queryKey: ['user-metrics', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_metrics')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching metrics:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch gift coverage data for progress bar
  const { data: giftCoverage } = useQuery({
    queryKey: ['gift-coverage', user?.id],
    queryFn: async () => {
      if (!user?.id) return { totalRecipients: 0, recipientsWithGifts: 0 };
      
      // Get total recipients
      const { data: recipients, error: recipientsError } = await supabase
        .from('recipients')
        .select('id')
        .eq('user_id', user.id);
      
      if (recipientsError) {
        console.error('Error fetching recipients:', recipientsError);
        return { totalRecipients: 0, recipientsWithGifts: 0 };
      }
      
      // Get recipients with scheduled gifts
      const { data: giftsData, error: giftsError } = await supabase
        .from('scheduled_gifts')
        .select('recipient_id')
        .eq('user_id', user.id)
        .eq('status', 'scheduled');
      
      if (giftsError) {
        console.error('Error fetching scheduled gifts:', giftsError);
        return { totalRecipients: recipients?.length || 0, recipientsWithGifts: 0 };
      }
      
      // Count unique recipients with gifts
      const uniqueRecipientIds = new Set(giftsData?.map(gift => gift.recipient_id) || []);
      
      return {
        totalRecipients: recipients?.length || 0,
        recipientsWithGifts: uniqueRecipientIds.size
      };
    },
    enabled: !!user?.id
  });

  const progressPercentage = giftCoverage?.totalRecipients > 0 
    ? (giftCoverage.recipientsWithGifts / giftCoverage.totalRecipients) * 100 
    : 0;

  return (
    <ResponsiveContainer>
      <ResponsiveHeader>
        <ResponsiveNavigation>
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-charcoal">Welcome back!</h1>
              <p className="text-brand-charcoal/70 mt-1 text-sm sm:text-base">Here's what's happening with your gifting schedule</p>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <AppNavigation />
          </div>
        </ResponsiveNavigation>

        <ResponsiveActions>
          <UserMenu />
        </ResponsiveActions>
      </ResponsiveHeader>

      {/* Gift Coverage Progress Bar */}
      {giftCoverage && giftCoverage.totalRecipients > 0 && (
        <div className="mb-6 sm:mb-8">
          <Card className="bg-white border-brand-cream">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-brand-charcoal">Gift Scheduling Progress</h3>
                    <p className="text-xs sm:text-sm text-brand-charcoal/70">
                      {giftCoverage.recipientsWithGifts} out of {giftCoverage.totalRecipients} recipients have scheduled gifts
                    </p>
                  </div>
                  <Badge 
                    variant={progressPercentage === 100 ? "default" : "secondary"}
                    className={progressPercentage === 100 ? "bg-green-100 text-green-800" : "bg-brand-cream text-brand-charcoal"}
                  >
                    {Math.round(progressPercentage)}%
                  </Badge>
                </div>
                <Progress 
                  value={progressPercentage} 
                  className="h-2 sm:h-3"
                />
                {progressPercentage < 100 && (
                  <p className="text-xs text-brand-charcoal/60">
                    Schedule gifts for {giftCoverage.totalRecipients - giftCoverage.recipientsWithGifts} more recipient{giftCoverage.totalRecipients - giftCoverage.recipientsWithGifts !== 1 ? 's' : ''} to complete your planning!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Development Test Data Manager */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6 sm:mb-8">
          <TestDataManager />
        </div>
      )}

      {/* Holiday Carousel */}
      <div className="mb-6 sm:mb-8">
        <HolidayCarousel />
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <Card className="bg-white border-brand-cream">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-brand-charcoal">Recipients</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-brand-charcoal" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-brand-charcoal">
              {metrics?.total_recipients || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-brand-cream">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-brand-charcoal">Scheduled</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-brand-charcoal" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-brand-charcoal">
              {metrics?.total_scheduled_gifts || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-brand-cream">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-brand-charcoal">Delivered</CardTitle>
            <Gift className="h-3 w-3 sm:h-4 sm:w-4 text-brand-charcoal" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-brand-charcoal">
              {metrics?.total_delivered_gifts || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-brand-cream">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-brand-charcoal">Time Saved</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-brand-charcoal" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-brand-charcoal">
              {metrics?.estimated_time_saved || 0}
              <span className="text-xs sm:text-sm font-normal text-brand-charcoal/70 ml-1">h</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        <div className="w-full">
          <UpcomingGiftsManager />
        </div>
        <div className="w-full">
          <DashboardRecipients />
        </div>
      </div>
    </ResponsiveContainer>
  );
};

export default Dashboard;

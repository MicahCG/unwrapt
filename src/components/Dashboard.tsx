
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import UserMenu from '@/components/auth/UserMenu';
import TestDataManager from '@/components/TestDataManager';
import RecipientsList from '@/components/RecipientsList';
import UpcomingGiftsManager from '@/components/UpcomingGiftsManager';
import DashboardRecipients from '@/components/DashboardRecipients';
import HolidayCarousel from '@/components/HolidayCarousel';
import AppNavigation from '@/components/AppNavigation';
import { ResponsiveContainer, ResponsiveHeader, ResponsiveNavigation, ResponsiveActions } from '@/components/ui/responsive-container';
import { Users, Gift, Clock, TrendingUp, Calendar, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const handleNavigation = (path: string) => {
    console.log('🔧 Dashboard: Navigating to:', path);
    navigate(path);
  };

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
          <Button
            variant="outline"
            onClick={() => handleNavigation('/calendar')}
            className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light w-full sm:w-auto"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleNavigation('/settings')}
            className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light w-full sm:w-auto"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <UserMenu />
        </ResponsiveActions>
      </ResponsiveHeader>

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
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-brand-gold" />
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
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-brand-gold" />
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
            <Gift className="h-3 w-3 sm:h-4 sm:w-4 text-brand-gold" />
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
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-brand-gold" />
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

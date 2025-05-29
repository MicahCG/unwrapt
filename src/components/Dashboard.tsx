
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UserMenu from '@/components/auth/UserMenu';
import TestDataManager from '@/components/TestDataManager';
import RecipientsList from '@/components/RecipientsList';
import UpcomingGiftsManager from '@/components/UpcomingGiftsManager';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-cream via-white to-brand-cream-light">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-brand-charcoal">Welcome back!</h1>
            <p className="text-brand-charcoal/70 mt-1">Manage your thoughtful gift-giving</p>
          </div>
          <UserMenu />
        </div>

        {/* Development Test Data Manager */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-8">
            <TestDataManager />
          </div>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-brand-cream">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-charcoal">Recipients</CardTitle>
              <Users className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-charcoal">
                {metrics?.total_recipients || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-brand-cream">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-charcoal">Scheduled Gifts</CardTitle>
              <Clock className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-charcoal">
                {metrics?.total_scheduled_gifts || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-brand-cream">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-charcoal">Delivered</CardTitle>
              <Gift className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-charcoal">
                {metrics?.total_delivered_gifts || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-brand-cream">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-charcoal">Time Saved</CardTitle>
              <TrendingUp className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-charcoal">
                {metrics?.estimated_time_saved || 0}
                <span className="text-sm font-normal text-brand-charcoal/70 ml-1">min</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <RecipientsList />
          </div>
          <div>
            <UpcomingGiftsManager />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

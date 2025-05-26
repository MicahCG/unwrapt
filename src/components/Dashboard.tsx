
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/components/auth/AuthProvider';
import UserMenu from '@/components/auth/UserMenu';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Calendar, Clock, Users, Plus, Star, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const Dashboard = () => {
  const { user } = useAuth();
  const [showAddRecipient, setShowAddRecipient] = useState(false);

  // Fetch user metrics
  const { data: metrics } = useQuery({
    queryKey: ['user-metrics', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_metrics')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch recipients
  const { data: recipients } = useQuery({
    queryKey: ['recipients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipients')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch upcoming scheduled gifts
  const { data: upcomingGifts } = useQuery({
    queryKey: ['upcoming-gifts', user?.id],
    queryFn: async () => {
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      
      const { data, error } = await supabase
        .from('scheduled_gifts')
        .select(`
          *,
          recipients (name, relationship)
        `)
        .eq('user_id', user?.id)
        .gte('occasion_date', today.toISOString().split('T')[0])
        .lte('occasion_date', nextMonth.toISOString().split('T')[0])
        .eq('status', 'scheduled')
        .order('occasion_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'ordered': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <div className="border-b border-brand-cream bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Logo variant="icon" size="md" className="mr-2" />
              <span className="font-bold text-lg text-brand-charcoal">Unwrapt</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setShowAddRecipient(true)}
                className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Recipient
              </Button>
              {user && <UserMenu />}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-charcoal mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-brand-charcoal/70">
            Here's what's happening with your gifting schedule
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-brand-gold" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-brand-charcoal/70">Recipients</p>
                  <p className="text-2xl font-bold text-brand-charcoal">{metrics?.total_recipients || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Gift className="h-8 w-8 text-brand-gold" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-brand-charcoal/70">Scheduled Gifts</p>
                  <p className="text-2xl font-bold text-brand-charcoal">{metrics?.total_scheduled_gifts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Star className="h-8 w-8 text-brand-gold" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-brand-charcoal/70">Delivered</p>
                  <p className="text-2xl font-bold text-brand-charcoal">{metrics?.total_delivered_gifts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-brand-gold" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-brand-charcoal/70">Time Saved</p>
                  <p className="text-2xl font-bold text-brand-charcoal">{metrics?.estimated_time_saved || 0}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Gifts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-brand-charcoal">
                <Calendar className="h-5 w-5 mr-2" />
                Upcoming Gifts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingGifts && upcomingGifts.length > 0 ? (
                <div className="space-y-4">
                  {upcomingGifts.map((gift: any) => (
                    <div key={gift.id} className="flex items-center justify-between p-3 bg-brand-cream-light rounded-lg">
                      <div>
                        <p className="font-medium text-brand-charcoal">{gift.recipients?.name}</p>
                        <p className="text-sm text-brand-charcoal/70">{gift.occasion}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-brand-charcoal">{formatDate(gift.occasion_date)}</p>
                        <Badge className={getStatusColor(gift.status)}>{gift.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 text-brand-charcoal/30 mx-auto mb-4" />
                  <p className="text-brand-charcoal/70">No upcoming gifts scheduled</p>
                  <Button 
                    className="mt-4 bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
                    onClick={() => setShowAddRecipient(true)}
                  >
                    Add Your First Recipient
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-brand-charcoal">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Your Recipients
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowAddRecipient(true)}
                  className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recipients && recipients.length > 0 ? (
                <div className="space-y-3">
                  {recipients.slice(0, 5).map((recipient: any) => (
                    <div key={recipient.id} className="flex items-center justify-between p-3 bg-brand-cream-light rounded-lg">
                      <div>
                        <p className="font-medium text-brand-charcoal">{recipient.name}</p>
                        <p className="text-sm text-brand-charcoal/70">{recipient.relationship}</p>
                      </div>
                      <div className="text-right">
                        {recipient.birthday && (
                          <p className="text-xs text-brand-charcoal/70">
                            Birthday: {formatDate(recipient.birthday)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {recipients.length > 5 && (
                    <p className="text-center text-sm text-brand-charcoal/70 pt-2">
                      +{recipients.length - 5} more recipients
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-brand-charcoal/30 mx-auto mb-4" />
                  <p className="text-brand-charcoal/70">No recipients added yet</p>
                  <Button 
                    className="mt-4 bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
                    onClick={() => setShowAddRecipient(true)}
                  >
                    Add Your First Recipient
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Motivational Section */}
        {recipients && recipients.length > 0 && (
          <Card className="mt-8 bg-gradient-to-r from-brand-gold/10 to-brand-cream border-brand-gold/20">
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-brand-gold mr-4" />
                <div>
                  <h3 className="text-lg font-semibold text-brand-charcoal mb-2">
                    You're doing great! 🎉
                  </h3>
                  <p className="text-brand-charcoal/70">
                    You've saved an estimated {metrics?.estimated_time_saved || 0} hours by automating your gift-giving. 
                    Add more recipients to never miss another special moment!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

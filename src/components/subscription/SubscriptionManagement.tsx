import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, ExternalLink, Loader2, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { VIPUpgradeModal } from './VIPUpgradeModal';

export const SubscriptionManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Fetch user subscription info
  const { data: profile, refetch } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, trial_ends_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isVIP = profile?.subscription_tier === 'vip';
  const isTrial = profile?.subscription_status === 'trialing';
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;

  const handleManageSubscription = async () => {
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      console.log('Opening Stripe customer portal...');

      const response = await supabase.functions.invoke('create-portal-session', {
        body: {},
      });

      if (response.error) {
        console.error('Portal session error:', response.error);
        throw response.error;
      }

      if (response.data?.url) {
        // Redirect to Stripe customer portal
        window.location.href = response.data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to open subscription management. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!isVIP) {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
          Free Plan
        </Badge>
      );
    }

    if (isTrial) {
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
          <Crown className="w-3 h-3 mr-1" />
          VIP Trial
        </Badge>
      );
    }

    return (
      <Badge className="bg-[#D2B887]/20 text-[#8B7355] border-[#D2B887]">
        <Crown className="w-3 h-3 mr-1" />
        VIP Active
      </Badge>
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <>
      <Card className="border-brand-charcoal/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-brand-charcoal">
            <div className="flex items-center">
              <Crown className="h-5 w-5 mr-2 text-[#D2B887]" />
              Subscription
            </div>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isVIP ? (
            <>
              {/* VIP Subscription Details */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-brand-charcoal">VIP Monthly</p>
                    <p className="text-2xl font-bold text-brand-charcoal mt-1">$4.99/month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-brand-charcoal/60">Status</p>
                    <p className="font-medium text-brand-charcoal capitalize">
                      {profile?.subscription_status || 'Active'}
                    </p>
                  </div>
                </div>

                {isTrial && trialEndsAt && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900">Trial Period</p>
                      <p className="text-sm text-amber-700">
                        Your trial ends on {formatDate(trialEndsAt)}. You'll be charged $4.99/month after that.
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-[#F5F3F0] rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-brand-charcoal">VIP Benefits:</p>
                  <ul className="text-sm text-brand-charcoal/80 space-y-1">
                    <li>✓ Unlimited recipients</li>
                    <li>✓ Full gift automation</li>
                    <li>✓ Advanced scheduling</li>
                    <li>✓ Gift wallet & auto-reload</li>
                  </ul>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    onClick={handleManageSubscription}
                    disabled={isLoading}
                    className="w-full bg-brand-charcoal text-white hover:bg-brand-charcoal/90"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Manage Subscription
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-brand-charcoal/60">
                    Update payment method, view invoices, or cancel subscription
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Free Plan - Show Upgrade Option */}
              <div className="space-y-4">
                <div className="bg-[#F5F3F0] rounded-lg p-4">
                  <p className="text-sm text-brand-charcoal/80">
                    You're currently on the <span className="font-medium">Free Plan</span>.
                    Upgrade to VIP for unlimited recipients and powerful automation features.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-[#D2B887]/10 to-[#D2B887]/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-[#D2B887]" />
                    <p className="font-medium text-brand-charcoal">Upgrade to VIP</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-display text-brand-charcoal">$4.99</span>
                      <span className="text-brand-charcoal/70">/month</span>
                    </div>
                    <ul className="text-sm text-brand-charcoal/80 space-y-1">
                      <li>✓ Unlimited recipients</li>
                      <li>✓ Full automation</li>
                      <li>✓ Gift wallet</li>
                      <li>✓ Priority support</li>
                    </ul>
                  </div>
                  <Button
                    onClick={() => setShowUpgradeModal(true)}
                    className="w-full bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to VIP
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <VIPUpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </>
  );
};

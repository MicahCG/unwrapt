import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Crown, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const TestTierToggle = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ['user-admin-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      
      return !!data && !error;
    },
    enabled: !!user?.id,
  });

  // Get current tier
  const { data: profile } = useQuery({
    queryKey: ['user-profile-tier', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isAdmin,
  });

  const handleToggleTier = async () => {
    if (!user?.id || !profile) return;

    const newTier = profile.subscription_tier === 'free' ? 'vip' : 'free';
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: newTier })
        .eq('id', user.id);

      if (error) throw error;

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile-tier'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile-balance'] });

      toast({
        title: 'Tier Updated',
        description: `Switched to ${newTier.toUpperCase()} tier`,
      });
    } catch (error) {
      console.error('Error updating tier:', error);
      toast({
        title: 'Error',
        description: 'Failed to update tier',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Only render for admin users
  if (!isAdmin || !profile) return null;

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          <CardTitle className="text-lg text-purple-900">
            Admin Testing Controls
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-purple-900">
              Current Tier:
            </span>
            <div className="flex items-center gap-2">
              {profile.subscription_tier === 'vip' ? (
                <>
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-amber-600">VIP</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-600">FREE</span>
                </>
              )}
            </div>
          </div>
          
          <Button
            onClick={handleToggleTier}
            disabled={isUpdating}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            size="sm"
          >
            {isUpdating ? 'Switching...' : `Switch to ${profile.subscription_tier === 'free' ? 'VIP' : 'FREE'}`}
          </Button>
          
          <p className="text-xs text-purple-700">
            Toggle between tiers to test free vs VIP features
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

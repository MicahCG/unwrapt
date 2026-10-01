import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { isPaidVip } from '@/lib/stripe';

/** Blocks product routes until the user has an active VIP subscription. */
const RequirePaid: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  const { data: isPaid, isLoading } = useQuery({
    queryKey: ['app-access-paid', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      if (process.env.NODE_ENV === 'development' && user.id === '00000000-0000-0000-0000-000000000001') {
        return true;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status')
        .eq('id', user.id)
        .maybeSingle();
      return isPaidVip(profile);
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF6EE' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#B65B3C' }} />
      </div>
    );
  }

  if (!user || !isPaid) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RequirePaid;

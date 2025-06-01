
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

const SettingsOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Prevent multiple processing attempts
      if (hasProcessed) {
        console.log('Already processed, skipping...');
        return;
      }

      console.log('Settings OAuth Callback component mounted');
      console.log('Current URL search params:', window.location.search);
      console.log('User in callback:', user);
      
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const state = searchParams.get('state');

      console.log('OAuth callback received:', { 
        hasCode: !!code, 
        codeLength: code?.length || 0,
        error, 
        state,
        userExists: !!user
      });

      if (error) {
        console.error('OAuth error received:', error);
        setHasProcessed(true);
        toast({
          title: "Calendar Connection Failed",
          description: error,
          variant: "destructive"
        });
        navigate('/settings', { replace: true });
        return;
      }

      if (!code) {
        console.log('No code received, redirecting to settings...');
        setHasProcessed(true);
        navigate('/settings', { replace: true });
        return;
      }

      // If we have a code but no user, wait for authentication
      if (!user) {
        console.log('No user found, waiting for auth state to update...');
        // Don't set hasProcessed here, let it retry when user becomes available
        return;
      }

      // We have both code and user, process the OAuth
      setHasProcessed(true);

      try {
        console.log('Processing OAuth code for calendar connection with user:', user.id);
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('No active session found');
        }

        // Exchange code for token
        console.log('Exchanging authorization code for access token...');
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('google-calendar', {
          body: { action: 'exchange_code', code },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          }
        });

        console.log('Token exchange response:', { 
          success: !!tokenData, 
          hasAccessToken: !!tokenData?.access_token,
          error: tokenError 
        });

        if (tokenError) {
          console.error('Token exchange error:', tokenError);
          throw new Error(tokenError.message || 'Failed to exchange authorization code');
        }

        if (!tokenData?.access_token) {
          throw new Error('No access token received from Google');
        }

        console.log('Calendar connected successfully from settings');
        
        toast({
          title: "Calendar Connected Successfully!",
          description: "Your Google Calendar has been connected to your account.",
        });

        navigate('/settings', { replace: true });

      } catch (error) {
        console.error('Error processing OAuth callback:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to process calendar connection';
        toast({
          title: "Calendar Connection Failed",
          description: errorMessage,
          variant: "destructive"
        });
        navigate('/settings', { replace: true });
      }
    };

    handleOAuthCallback();
  }, [navigate, searchParams, toast, user, hasProcessed]);

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal mx-auto mb-4"></div>
        <p className="text-brand-charcoal">Connecting Google Calendar...</p>
        <p className="text-brand-charcoal/70 text-sm mt-2">
          {!user ? 'Waiting for authentication...' : 'Processing connection...'}
        </p>
      </div>
    </div>
  );
};

export default SettingsOAuthCallback;

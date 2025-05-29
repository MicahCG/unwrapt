
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

const SettingsOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('Settings OAuth Callback component mounted');
      console.log('Current URL search params:', window.location.search);
      
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const state = searchParams.get('state');

      console.log('OAuth callback received:', { 
        hasCode: !!code, 
        codeLength: code?.length || 0,
        error, 
        state 
      });

      if (error) {
        console.error('OAuth error received:', error);
        toast({
          title: "Calendar Connection Failed",
          description: error,
          variant: "destructive"
        });
        navigate('/settings', { replace: true });
        return;
      }

      if (code && user) {
        try {
          console.log('Processing OAuth code for calendar connection...');
          
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
      } else {
        console.log('No code or user, redirecting to settings...');
        navigate('/settings', { replace: true });
      }
    };

    handleOAuthCallback();
  }, [navigate, searchParams, toast, user]);

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal mx-auto mb-4"></div>
        <p className="text-brand-charcoal">Connecting Google Calendar...</p>
        <p className="text-brand-charcoal/70 text-sm mt-2">You'll be redirected to settings shortly</p>
      </div>
    </div>
  );
};

export default SettingsOAuthCallback;

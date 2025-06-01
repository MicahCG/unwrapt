
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

const SettingsOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [hasProcessed, setHasProcessed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (hasProcessed || isProcessing) {
        console.log('📋 SettingsOAuthCallback: Already processed or processing, skipping...');
        return;
      }

      console.log('📋 SettingsOAuthCallback: Processing callback');
      console.log('📋 SettingsOAuthCallback: Current URL:', window.location.href);
      
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      console.log('📋 SettingsOAuthCallback: OAuth params:', { 
        hasCode: !!code, 
        error
      });

      if (error) {
        console.error('📋 SettingsOAuthCallback: OAuth error received:', error);
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
        console.log('📋 SettingsOAuthCallback: No code received, redirecting...');
        setHasProcessed(true);
        navigate('/settings', { replace: true });
        return;
      }

      // Wait for auth loading to complete
      if (loading) {
        console.log('📋 SettingsOAuthCallback: Auth still loading, waiting...');
        return;
      }

      // Set processing flag immediately
      setIsProcessing(true);

      try {
        console.log('📋 SettingsOAuthCallback: Getting current session...');
        
        // Get session directly each time to ensure we have the most current one
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('📋 SettingsOAuthCallback: Session error:', sessionError);
          throw new Error('Failed to get current session');
        }

        if (!session || !session.user) {
          console.error('📋 SettingsOAuthCallback: No active session found');
          throw new Error('No active session found. Please log in again.');
        }

        console.log('📋 SettingsOAuthCallback: Session found for user:', session.user.id);
        console.log('📋 SettingsOAuthCallback: Exchanging authorization code...');

        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('google-calendar', {
          body: { action: 'exchange_code', code },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          }
        });

        console.log('📋 SettingsOAuthCallback: Token exchange response:', { 
          success: !!tokenData, 
          hasAccessToken: !!tokenData?.access_token,
          error: tokenError 
        });

        if (tokenError) {
          console.error('📋 SettingsOAuthCallback: Token exchange error:', tokenError);
          throw new Error(tokenError.message || 'Failed to exchange authorization code');
        }

        if (!tokenData?.access_token) {
          throw new Error('No access token received from Google');
        }

        console.log('📋 SettingsOAuthCallback: Calendar connected successfully');
        setHasProcessed(true);
        
        toast({
          title: "Calendar Connected Successfully!",
          description: "Redirecting to your calendar view...",
        });

        // Redirect to calendar view instead of settings
        navigate('/calendar', { replace: true });

      } catch (error) {
        console.error('📋 SettingsOAuthCallback: Error processing OAuth callback:', error);
        setHasProcessed(true);
        const errorMessage = error instanceof Error ? error.message : 'Failed to process calendar connection';
        toast({
          title: "Calendar Connection Failed",
          description: errorMessage,
          variant: "destructive"
        });
        navigate('/settings', { replace: true });
      } finally {
        setIsProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [navigate, searchParams, toast, loading, hasProcessed, isProcessing]);

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal mx-auto mb-4"></div>
        <p className="text-brand-charcoal">Connecting Google Calendar...</p>
        <p className="text-brand-charcoal/70 text-sm mt-2">
          {loading ? 'Loading authentication...' : 
           isProcessing ? 'Processing connection...' : 
           'Preparing connection...'}
        </p>
      </div>
    </div>
  );
};

export default SettingsOAuthCallback;


import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

const CalendarOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [hasProcessed, setHasProcessed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const maxRetries = 15;
  const retryDelay = 500;

  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (hasProcessed || isProcessing) {
        console.log('📅 CalendarOAuthCallback: Already processed or processing, skipping...');
        return;
      }

      console.log('📅 CalendarOAuthCallback: Processing callback');
      console.log('📅 CalendarOAuthCallback: Current URL:', window.location.href);
      console.log('📅 CalendarOAuthCallback: User from AuthProvider:', { 
        hasUser: !!user, 
        userId: user?.id,
        loading
      });
      
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const state = searchParams.get('state');

      console.log('📅 CalendarOAuthCallback: OAuth params:', { 
        hasCode: !!code, 
        error, 
        state,
        retryCount
      });

      if (error) {
        console.error('📅 CalendarOAuthCallback: OAuth error received:', error);
        setHasProcessed(true);
        toast({
          title: "Calendar Connection Failed",
          description: error,
          variant: "destructive"
        });
        // Redirect back to app
        window.location.href = 'https://app.unwrapt.io';
        return;
      }

      if (!code) {
        console.log('📅 CalendarOAuthCallback: No code received, redirecting...');
        setHasProcessed(true);
        window.location.href = 'https://app.unwrapt.io';
        return;
      }

      // Wait for auth loading to complete
      if (loading) {
        console.log('📅 CalendarOAuthCallback: Auth still loading, waiting...');
        return;
      }

      // Check session directly from Supabase if user isn't available from provider
      let currentUser = user;
      if (!currentUser) {
        console.log('📅 CalendarOAuthCallback: User not available from provider, checking session...');
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.error('📅 CalendarOAuthCallback: Error checking session:', sessionError);
          } else {
            currentUser = session?.user || null;
            console.log('📅 CalendarOAuthCallback: Session check result:', { 
              hasSession: !!session, 
              hasUser: !!currentUser,
              userId: currentUser?.id
            });
          }
        } catch (sessionError) {
          console.error('📅 CalendarOAuthCallback: Error checking session:', sessionError);
        }
      }

      // Retry logic if user is still not available
      if (!currentUser) {
        if (retryCount < maxRetries) {
          console.log(`📅 CalendarOAuthCallback: No user found, retry ${retryCount + 1}/${maxRetries}`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, retryDelay);
          return;
        } else {
          console.error('📅 CalendarOAuthCallback: Max retries reached, user still not available');
          setHasProcessed(true);
          toast({
            title: "Authentication Required",
            description: "Please log in again to connect your calendar.",
            variant: "destructive"
          });
          window.location.href = 'https://app.unwrapt.io';
          return;
        }
      }

      // Process the OAuth callback
      setIsProcessing(true);
      setHasProcessed(true);

      try {
        console.log('📅 CalendarOAuthCallback: Processing OAuth code for user:', currentUser.id);
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error('No active session found');
        }

        console.log('📅 CalendarOAuthCallback: Exchanging authorization code...');
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('google-calendar', {
          body: { action: 'exchange_code', code },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          }
        });

        console.log('📅 CalendarOAuthCallback: Token exchange response:', { 
          success: !!tokenData, 
          hasAccessToken: !!tokenData?.access_token,
          error: tokenError 
        });

        if (tokenError) {
          console.error('📅 CalendarOAuthCallback: Token exchange error:', tokenError);
          throw new Error(tokenError.message || 'Failed to exchange authorization code');
        }

        if (!tokenData?.access_token) {
          throw new Error('No access token received from Google');
        }

        console.log('📅 CalendarOAuthCallback: Calendar connected successfully, redirecting to onboarding');
        
        toast({
          title: "Calendar Connected Successfully!",
          description: "Your Google Calendar has been connected. Returning to setup...",
        });

        // Redirect back to app onboarding - it will detect the connection and show events
        window.location.href = 'https://app.unwrapt.io/onboarding';

      } catch (error) {
        console.error('📅 CalendarOAuthCallback: Error processing OAuth callback:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to process calendar connection';
        toast({
          title: "Calendar Connection Failed",
          description: errorMessage,
          variant: "destructive"
        });
        window.location.href = 'https://app.unwrapt.io';
      } finally {
        setIsProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [navigate, searchParams, toast, user, loading, hasProcessed, retryCount, isProcessing]);

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal mx-auto mb-4"></div>
        <p className="text-brand-charcoal">Connecting Google Calendar...</p>
        <p className="text-brand-charcoal/70 text-sm mt-2">
          {loading ? 'Loading authentication...' : 
           !user ? `Waiting for authentication... (${retryCount}/${maxRetries})` : 
           'Processing connection...'}
        </p>
      </div>
    </div>
  );
};

export default CalendarOAuthCallback;


import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('🔧 OAuthCallback: Processing callback');
    console.log('🔧 OAuthCallback: Current URL search params:', window.location.search);
    
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    console.log('🔧 OAuthCallback: OAuth callback received:', { 
      hasCode: !!code, 
      codeLength: code?.length || 0,
      error, 
      state 
    });

    if (error) {
      console.error('🔧 OAuthCallback: OAuth error received:', error);
      // Clear any existing code from sessionStorage on error
      sessionStorage.removeItem('google_oauth_code');
      navigate('/', { replace: true });
      return;
    }

    if (code) {
      console.log('🔧 OAuthCallback: Storing OAuth code and redirecting based on state:', state);
      
      // Store the code in sessionStorage so the appropriate component can pick it up
      sessionStorage.setItem('google_oauth_code', code);
      
      // Redirect based on state parameter
      if (state === 'settings') {
        navigate('/settings', { replace: true });
      } else {
        // Default to home for calendar connection (onboarding context)
        navigate('/', { replace: true });
      }
    } else {
      console.log('🔧 OAuthCallback: No code or error received, redirecting to home...');
      navigate('/', { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal mx-auto mb-4"></div>
        <p className="text-brand-charcoal">Processing Google Calendar connection...</p>
        <p className="text-brand-charcoal/70 text-sm mt-2">You'll be redirected shortly</p>
      </div>
    </div>
  );
};

export default OAuthCallback;

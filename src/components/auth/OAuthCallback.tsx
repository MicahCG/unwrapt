
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('OAuth Callback component mounted');
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
      // Clear any existing code from sessionStorage on error
      sessionStorage.removeItem('google_oauth_code');
      navigate('/', { replace: true });
      return;
    }

    if (code) {
      console.log('Storing OAuth code in sessionStorage and redirecting...');
      // Store the code in sessionStorage so CalendarStep can pick it up
      sessionStorage.setItem('google_oauth_code', code);
      
      // Redirect back to the main app where CalendarStep will process it
      navigate('/', { replace: true });
    } else {
      console.log('No code or error received, redirecting to home...');
      // No code or error, redirect back
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

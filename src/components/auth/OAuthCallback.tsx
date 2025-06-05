
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('🔧 OAuthCallback: Processing callback');
    console.log('🔧 OAuthCallback: Current URL:', window.location.href);
    
    // Don't clean up the URL here - let Supabase handle the OAuth flow
    // The hash fragment contains the access token that Supabase needs
    
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    console.log('🔧 OAuthCallback: OAuth callback received:', { 
      hasCode: !!code, 
      codeLength: code?.length || 0,
      error, 
      state,
      hasHashFragment: !!window.location.hash 
    });

    if (error) {
      console.error('🔧 OAuthCallback: OAuth error received:', error);
      // Clear any existing code from sessionStorage on error
      sessionStorage.removeItem('google_oauth_code');
      navigate('/', { replace: true });
      return;
    }

    // For hash-based OAuth flows (like implicit grant), let Supabase handle it
    if (window.location.hash && window.location.hash.includes('access_token')) {
      console.log('🔧 OAuthCallback: Hash-based OAuth flow detected, letting Supabase handle');
      // Just redirect to home and let AuthProvider handle the token
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1000); // Give Supabase time to process the token
      return;
    }

    if (code) {
      console.log('🔧 OAuthCallback: Storing OAuth code and redirecting to dashboard');
      
      // Store the code in sessionStorage so it can be picked up if needed
      sessionStorage.setItem('google_oauth_code', code);
      
      // Navigate to dashboard using React Router
      navigate('/', { replace: true });
    } else {
      console.log('🔧 OAuthCallback: No code or error received, redirecting to dashboard...');
      navigate('/', { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal mx-auto mb-4"></div>
        <p className="text-brand-charcoal">Processing authentication...</p>
        <p className="text-brand-charcoal/70 text-sm mt-2">Redirecting you to the dashboard</p>
      </div>
    </div>
  );
};

export default OAuthCallback;

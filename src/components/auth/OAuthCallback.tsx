
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      navigate('/', { replace: true });
      return;
    }

    if (code) {
      // Store the code in sessionStorage so CalendarStep can pick it up
      sessionStorage.setItem('google_oauth_code', code);
      
      // Redirect back to the main app
      navigate('/', { replace: true });
    } else {
      // No code or error, redirect back
      navigate('/', { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal mx-auto mb-4"></div>
        <p className="text-brand-charcoal">Processing Google Calendar connection...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;

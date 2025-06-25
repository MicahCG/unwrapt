
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Logo } from '@/components/ui/logo';
import { useAuth } from './AuthProvider';

const LoginPage: React.FC = () => {
  const { signInWithGoogle, loading } = useAuth();

  const handleDevLogin = () => {
    // Create a fake user session for development
    const fakeUser = {
      id: 'dev-user-123',
      email: 'dev@example.com',
      user_metadata: {
        name: 'Dev User',
        avatar_url: null
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Manually trigger auth state change to simulate login
    window.dispatchEvent(new CustomEvent('fake-auth', { 
      detail: { user: fakeUser, session: { user: fakeUser, access_token: 'fake-token' } } 
    }));
  };

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-4">
      <Card className="w-full max-w-md animate-fadeInUp border-brand-cream shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <Logo variant="full" size="lg" />
          </div>
          <p className="text-xl text-brand-charcoal/80">
            Never miss a moment
          </p>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Development Login Shortcut */}
            {process.env.NODE_ENV === 'development' && (
              <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                <p className="text-sm text-yellow-800 mb-2 font-medium">Development Mode</p>
                <Button 
                  size="sm" 
                  className="w-full bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
                  onClick={handleDevLogin}
                >
                  🚀 Skip to Dashboard (Dev Only)
                </Button>
              </div>
            )}

            {/* Features Preview */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-lg border border-brand-cream">
                <div className="w-2 h-2 bg-brand-gold rounded-full"></div>
                <span className="text-sm text-brand-charcoal">Automate your gifts</span>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-lg border border-brand-cream">
                <div className="w-2 h-2 bg-brand-gold rounded-full"></div>
                <span className="text-sm text-brand-charcoal">Curate them based on interests</span>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-lg border border-brand-cream">
                <div className="w-2 h-2 bg-brand-gold rounded-full"></div>
                <span className="text-sm text-brand-charcoal">Save time and show you care</span>
              </div>
            </div>

            {/* Google Sign In */}
            <Button 
              size="lg" 
              className="w-full text-lg py-6 bg-white text-brand-charcoal border border-brand-charcoal/20 hover:bg-brand-cream-light transition-colors"
              onClick={signInWithGoogle}
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Get Started
            </Button>
            
            <p className="text-center text-sm text-brand-charcoal/60">
              Join 1,000+ people who never forget to show they care
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;

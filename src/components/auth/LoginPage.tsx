
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Logo } from '@/components/ui/logo';
import { useAuth } from './AuthProvider';

const LoginPage: React.FC = () => {
  const { signInWithGoogle, loading } = useAuth();

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-4">
      <Card className="w-full max-w-md animate-fadeInUp border-brand-cream shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <Logo variant="full" size="lg" />
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Hero Text */}
            <div className="text-center space-y-3">
              <h1 className="text-3xl md:text-4xl font-serif text-brand-charcoal">
                Never Miss a Moment
              </h1>
              <p className="text-brand-charcoal/70 text-base leading-relaxed">
                We remember every occasion, find the perfect gift, and deliver it so you become the most thoughtful person you know.
              </p>
            </div>

            {/* Get Started Free - Google Sign In */}
            <Button 
              size="lg" 
              className="w-full text-lg py-6 bg-brand-gold text-white hover:bg-brand-gold/90 transition-colors"
              onClick={signInWithGoogle}
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              ) : (
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Get Started Free
            </Button>
            
            {/* Learn More - Secondary button */}
            <Button 
              variant="outline"
              size="lg" 
              className="w-full text-lg py-6 bg-white text-brand-charcoal border border-brand-charcoal/20 hover:bg-brand-cream-light transition-colors"
              onClick={() => window.location.href = 'https://unwrapt.io'}
            >
              Learn More
            </Button>
            
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;

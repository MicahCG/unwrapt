import React, { useEffect, useState } from 'react';
import { TheaCharacter } from '@/components/unwrapt2/TheaCharacter';
import { MobileShell, Eyebrow, Display } from '@/components/unwrapt2/MobileShell';
import { U } from '@/components/unwrapt2/theme';
import { useAuth } from './AuthProvider';
import { trackProductEvent } from '@/lib/productAnalytics';
import { useToast } from '@/hooks/use-toast';

const IDLE_MS = 3000;
const WAVE_MS = 3200;

/** Thea rests in her default pose, waves hello after a few seconds, then settles again. */
const GreetingThea: React.FC = () => {
  const [waving, setWaving] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setWaving((w) => !w), waving ? WAVE_MS : IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [waving]);
  return <TheaCharacter size="large" pose={waving ? 'welcome' : 'basic'} bubble="Hi, I’m Thea, your gifting agent" />;
};

const GoogleMark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

/**
 * The logged-out front door and the start of onboarding in one screen: Thea's welcome with
 * Google sign-in as the main action. Signed-in new users go straight to importing birthdays.
 */
const LoginPage: React.FC = () => {
  const { signInWithGoogle, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    void trackProductEvent('auth_started', { provider: 'google', placement: 'login' });
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      toast({ title: 'Couldn’t sign in', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      // On the web the page navigates away; in the app the sign-in sheet may be dismissed.
      setSigningIn(false);
    }
  };

  return (
    <MobileShell
      glow
      contentClassName="flex flex-col justify-between overflow-y-auto px-7 pt-16 pb-4"
      footer={
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={loading || signingIn}
            aria-busy={signingIn}
            className="u-press flex min-h-[54px] w-full items-center justify-center gap-3 rounded-[16px] text-[16px] font-semibold disabled:opacity-60"
            style={{ background: U.ink, color: U.buttonText }}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white"><GoogleMark /></span>
            {signingIn ? 'Opening Google…' : 'Continue with Google'}
          </button>
          <p className="text-center text-[11.5px] leading-4" style={{ color: U.muted }}>
            Google only signs you in. Takes about two minutes.
          </p>
        </div>
      }
    >
      <div className="flex items-center justify-between">
        <span className="font-display" style={{ fontSize: 23, letterSpacing: '-0.3px' }}>Unwrapt</span>
        <Eyebrow>Concierge</Eyebrow>
      </div>
      <div className="flex flex-1 flex-col justify-center pt-6 text-center [&>*]:shrink-0">
        <GreetingThea />
        <Display className="mt-5" style={{ fontSize: 40, lineHeight: 1.02, letterSpacing: '-0.03em' }}>
          Never forget another<br />
          <em style={{ fontStyle: 'italic', fontWeight: 400, color: U.accent }}>moment.</em>
        </Display>
        <p className="mx-auto mt-4" style={{ fontSize: 15, lineHeight: 1.5, color: U.textSecondary, maxWidth: 300 }}>
          I remember who matters, and help you handle every gift.
        </p>
      </div>
    </MobileShell>
  );
};

export default LoginPage;

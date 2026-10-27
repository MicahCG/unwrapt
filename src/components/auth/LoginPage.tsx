import React, { useEffect, useState } from 'react';
import { TheaCharacter } from '@/components/unwrapt2/TheaCharacter';
import { MobileShell, Eyebrow, Display } from '@/components/unwrapt2/MobileShell';
import { U } from '@/components/unwrapt2/theme';
import { SignInCancelled, useAuth } from './AuthProvider';
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
const AppleMark = () => (
  <svg width="17" height="20" viewBox="0 0 17 20" aria-hidden="true" fill="currentColor">
    <path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1ZM11.6 3c.7-.9 1.2-2 1-3.2-1 .1-2.2.7-3 1.6-.6.7-1.2 1.9-1.1 3.1 1.2.1 2.3-.6 3.1-1.5Z" />
  </svg>
);

type Mode = 'choose' | 'email' | 'code';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginPage: React.FC = () => {
  const { signInWithGoogle, signInWithApple, sendEmailCode, verifyEmailCode, loading } = useAuth();
  const [busy, setBusy] = useState<'google' | 'apple' | 'email' | null>(null);
  const [mode, setMode] = useState<Mode>('choose');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const run = async (method: 'google' | 'apple' | 'email', action: () => Promise<void>, onDone?: () => void) => {
    setBusy(method);
    setError(null);
    try {
      await action();
      onDone?.();
    } catch (err) {
      if (err instanceof SignInCancelled) return;
      const message = err instanceof Error ? err.message : 'Please try again.';
      if (mode === 'choose') toast({ title: 'Couldn’t sign in', description: message, variant: 'destructive' });
      else setError(message);
    } finally {
      // On the web Google and Apple navigate away; in the app a sheet may simply be closed.
      setBusy(null);
    }
  };

  const start = (method: 'google' | 'apple') => {
    void trackProductEvent('auth_started', { provider: method, placement: 'login' });
    void run(method, method === 'google' ? signInWithGoogle : signInWithApple);
  };

  const sendCode = () => {
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    void trackProductEvent('auth_started', { provider: 'email', placement: 'login' });
    void run('email', () => sendEmailCode(email), () => { setCode(''); setMode('code'); });
  };

  const verify = (value = code) => {
    if (value.trim().length < 6) return;
    void run('email', () => verifyEmailCode(email, value));
  };

  const disabled = loading || busy !== null;
  const secondary = 'u-press min-h-11 w-full text-[13.5px] font-semibold disabled:opacity-50';

  const choose = (
    <div className="space-y-2">
      {/* Apple's style rules: black button, white Apple mark, same size as other sign-in options. */}
      <button
        type="button"
        onClick={() => start('apple')}
        disabled={disabled}
        aria-busy={busy === 'apple'}
        className="u-press flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] text-[16px] font-semibold disabled:opacity-60"
        style={{ background: '#000', color: '#fff' }}
      >
        <AppleMark />
        {busy === 'apple' ? 'Signing in…' : 'Continue with Apple'}
      </button>
      <button
        type="button"
        onClick={() => start('google')}
        disabled={disabled}
        aria-busy={busy === 'google'}
        className="u-press flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] border text-[16px] font-semibold disabled:opacity-60"
        style={{ background: '#fff', color: U.ink, borderColor: U.borderStrong }}
      >
        <GoogleMark />
        {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
      </button>
      <button type="button" onClick={() => { setError(null); setMode('email'); }} disabled={disabled} className={secondary} style={{ color: U.ink }}>
        Continue with email
      </button>
    </div>
  );

  const emailStep = (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); sendCode(); }}>
      <label htmlFor="login-email" className="block text-[14px] font-semibold" style={{ color: U.ink }}>Your email</label>
      <input
        id="login-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="min-h-[52px] w-full rounded-[14px] border bg-white px-4 text-[16px] outline-none focus:ring-2"
        style={{ borderColor: U.borderStrong, color: U.ink }}
      />
      {error && <p role="alert" className="text-[12.5px]" style={{ color: U.accent }}>{error}</p>}
      <button type="submit" disabled={disabled} aria-busy={busy === 'email'} className="u-press min-h-[52px] w-full rounded-[14px] text-[16px] font-semibold disabled:opacity-60" style={{ background: U.ink, color: U.buttonText }}>
        {busy === 'email' ? 'Sending…' : 'Email me a code'}
      </button>
      <button type="button" onClick={() => { setError(null); setMode('choose'); }} disabled={disabled} className={secondary} style={{ color: U.subtle }}>
        Other ways to sign in
      </button>
    </form>
  );

  const codeStep = (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); verify(); }}>
      <label htmlFor="login-code" className="block text-[14px] font-semibold" style={{ color: U.ink }}>
        Enter the 6-digit code sent to {email.trim()}
      </label>
      <input
        id="login-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        value={code}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, '').slice(0, 6);
          setCode(next);
          if (next.length === 6) verify(next);
        }}
        placeholder="123456"
        className="min-h-[52px] w-full rounded-[14px] border bg-white px-4 text-center font-mono text-[22px] tracking-[0.3em] outline-none focus:ring-2"
        style={{ borderColor: U.borderStrong, color: U.ink }}
      />
      {error && <p role="alert" className="text-[12.5px]" style={{ color: U.accent }}>{error}</p>}
      <button type="submit" disabled={disabled || code.length < 6} aria-busy={busy === 'email'} className="u-press min-h-[52px] w-full rounded-[14px] text-[16px] font-semibold disabled:opacity-60" style={{ background: U.ink, color: U.buttonText }}>
        {busy === 'email' ? 'Checking…' : 'Sign in'}
      </button>
      <div className="grid grid-cols-2">
        <button type="button" onClick={sendCode} disabled={disabled} className={secondary} style={{ color: U.accent }}>Send a new code</button>
        <button type="button" onClick={() => { setError(null); setMode('email'); }} disabled={disabled} className={secondary} style={{ color: U.subtle }}>Change email</button>
      </div>
    </form>
  );

  return (
    <MobileShell
      glow
      contentClassName="flex flex-col justify-between overflow-y-auto px-7 pt-16 pb-4"
      footer={
        <div>
          {mode === 'choose' ? choose : mode === 'email' ? emailStep : codeStep}
          <p className="mt-1.5 text-center text-[11px] leading-4" style={{ color: U.muted }}>
            By continuing you agree to the{' '}
            <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy Policy</a>.
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

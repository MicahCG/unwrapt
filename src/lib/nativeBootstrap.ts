import { Capacitor } from '@capacitor/core';
import { isNativeApp } from '@/lib/native';
import { configureIap, identifyIapUser } from '@/lib/iap';
import { supabase } from '@/integrations/supabase/client';

/**
 * One-time Capacitor bootstrap: status bar, splash, deep-link routing, IAP.
 * Safe to call on web (no-ops).
 */
export async function bootstrapNativeApp(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#EDE6D8' });
    }
  } catch (e) {
    console.warn('[native] StatusBar unavailable', e);
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (e) {
    console.warn('[native] SplashScreen unavailable', e);
  }

  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
  } catch {
    /* optional */
  }

  await setupDeepLinks();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  await configureIap(session?.user?.id);
  if (session?.user?.id) {
    await identifyIapUser(session.user.id);
  }

  supabase.auth.onAuthStateChange((_event, next) => {
    if (next?.user?.id) {
      void identifyIapUser(next.user.id);
    }
  });
}

async function setupDeepLinks(): Promise<void> {
  const { App } = await import('@capacitor/app');
  const { Browser } = await import('@capacitor/browser');

  const handleUrl = async (url: string) => {
    console.log('[native] deep link', url);
    try {
      await Browser.close();
    } catch {
      /* may not be open */
    }

    try {
      const parsed = new URL(url);
      const customScheme = parsed.protocol === 'io.unwrapt.app:' || parsed.protocol === 'unwrapt:';
      // io.unwrapt.app://auth/callback parses with host "auth" and path "/callback".
      const path = customScheme ? `/${parsed.host}${parsed.pathname}` : parsed.pathname;

      // Google sign-in: store the session inside the app. Never navigate to the https site,
      // which would leave the bundled app and run the website in its place.
      if (path === '/auth/callback' || (path === '/' && parsed.hash.includes('access_token'))) {
        const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        const code = parsed.searchParams.get('code');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          console.warn('[native] sign-in returned without a session', hash.get('error_description') || parsed.searchParams.get('error_description'));
        }
        window.location.replace('/');
        return;
      }

      // Any other link (calendar callback, payment success) opens that screen inside the app.
      const target = `${path || '/'}${parsed.search}${parsed.hash}`;
      if (window.location.pathname + window.location.search + window.location.hash !== target) {
        window.location.assign(target);
      }
    } catch (e) {
      console.error('[native] failed to handle deep link', e);
    }
  };

  App.addListener('appUrlOpen', ({ url }) => {
    void handleUrl(url);
  });

  // Cold start from a link
  const launch = await App.getLaunchUrl();
  if (launch?.url) {
    void handleUrl(launch.url);
  }
}

/**
 * Open an external OAuth URL in the system browser (SFSafariViewController),
 * then return via Universal Link / custom scheme.
 */
export async function openExternalAuthUrl(url: string): Promise<void> {
  if (!isNativeApp()) {
    window.location.assign(url);
    return;
  }
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({
    url,
    presentationStyle: 'popover',
    windowName: '_blank',
  });
}

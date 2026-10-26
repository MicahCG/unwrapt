import { Capacitor } from '@capacitor/core';
import { appOrigin, isNativeApp } from '@/lib/native';
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
      // Supabase OAuth returns tokens in hash or code in query
      const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      if (parsed.hash.includes('access_token') || parsed.searchParams.has('code')) {
        // Let supabase-js pick up the session from the URL
        window.location.replace(`${appOrigin()}${path || '/'}`);
        return;
      }
      // In-app navigation for Universal Links into the SPA
      const target = path && path !== '/' ? path : '/';
      if (window.location.pathname + window.location.search + window.location.hash !== target) {
        window.location.assign(target.startsWith('http') ? target : target);
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

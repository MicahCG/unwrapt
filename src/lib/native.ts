import { Capacitor } from '@capacitor/core';

/** True when running inside the Capacitor iOS/Android shell. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function nativePlatform(): 'ios' | 'android' | 'web' {
  const p = Capacitor.getPlatform();
  if (p === 'ios' || p === 'android') return p;
  return 'web';
}

/**
 * Where Google sign-in returns in the iOS app. The custom scheme (registered in Info.plist)
 * always reopens the app from the in-app browser; an https link would just load the website
 * there. Add it to Supabase Auth → URL Configuration → Redirect URLs.
 */
export const NATIVE_AUTH_CALLBACK = 'io.unwrapt.app://auth/callback';

/**
 * Origin used for OAuth redirect URIs.
 * Native uses the HTTPS Universal Link host so Google/Supabase callbacks
 * can return into the app via associated domains.
 */
export function appOrigin(): string {
  if (isNativeApp()) return 'https://app.unwrapt.io';
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://app.unwrapt.io';
}

/** Path-only navigation that works in both web and Capacitor. */
export function navigateAppPath(path: string): void {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined') {
    window.location.href = `${appOrigin()}${normalized}`;
  }
}

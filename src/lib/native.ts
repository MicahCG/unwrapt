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

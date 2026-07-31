import { supabase } from '@/integrations/supabase/client';

type AnalyticsProperty = string | number | boolean | null;
type AnalyticsProperties = Record<string, AnalyticsProperty>;

const ANONYMOUS_ID_KEY = 'unwrapt_anonymous_id';
const SESSION_ID_KEY = 'unwrapt_session_id';
const OPT_OUT_KEY = 'unwrapt_analytics_opt_out';

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getStoredId = (storage: Storage, key: string) => {
  const existing = storage.getItem(key);
  if (existing) return existing;

  const value = createId();
  storage.setItem(key, value);
  return value;
};

export const getAnonymousId = () => {
  if (typeof window === 'undefined') return 'server';
  return getStoredId(window.localStorage, ANONYMOUS_ID_KEY);
};

const getSessionId = () => {
  if (typeof window === 'undefined') return 'server';
  return getStoredId(window.sessionStorage, SESSION_ID_KEY);
};

const analyticsAllowed = () => {
  if (typeof window === 'undefined') return false;

  const navigatorWithPrivacy = navigator as Navigator & {
    globalPrivacyControl?: boolean;
  };

  return (
    window.localStorage.getItem(OPT_OUT_KEY) !== 'true' &&
    navigatorWithPrivacy.globalPrivacyControl !== true
  );
};

const cleanProperties = (properties: AnalyticsProperties) =>
  Object.fromEntries(
    Object.entries(properties)
      .filter(([key]) => !/email|name|phone|address|token/i.test(key))
      .slice(0, 20),
  );

const getReferrerHost = () => {
  if (!document.referrer) return null;

  try {
    return new URL(document.referrer).hostname;
  } catch {
    return null;
  }
};

export const trackProductEvent = async (
  eventName: string,
  properties: AnalyticsProperties = {},
  experiment?: { key: string; variant: string },
) => {
  if (!analyticsAllowed()) return;

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id ?? null;

  const payload = {
    event_id: createId(),
    event_name: eventName,
    anonymous_id: getAnonymousId(),
    session_id: getSessionId(),
    user_id: userId,
    page_path: `${window.location.pathname}${window.location.search}`,
    referrer_host: getReferrerHost(),
    properties: cleanProperties(properties),
    experiment_key: experiment?.key ?? null,
    variant: experiment?.variant ?? null,
  };

  const { error } = await supabase
    .from('product_analytics_events' as never)
    .insert(payload as never);

  if (error && import.meta.env.DEV) {
    console.debug('Product analytics event was not recorded:', error.message);
  }
};

export const trackPageView = (path: string) =>
  trackProductEvent('page_viewed', { path });

import { supabase } from '@/integrations/supabase/client';

type AnalyticsProperty = string | number | boolean | null;
type AnalyticsProperties = Record<string, AnalyticsProperty>;

type AnalyticsPayload = {
  event_id: string;
  event_name: string;
  anonymous_id: string;
  session_id: string;
  user_id: string | null;
  client_created_at: string;
  page_path: string;
  referrer_host: string | null;
  properties: AnalyticsProperties;
  experiment_key: string | null;
  variant: string | null;
};

type QueuedAnalyticsEvent = {
  payload: AnalyticsPayload;
  attempts: number;
  queuedAt: number;
};

const ANONYMOUS_ID_KEY = 'unwrapt_anonymous_id';
const SESSION_ID_KEY = 'unwrapt_session_id';
const OPT_OUT_KEY = 'unwrapt_analytics_opt_out';
const RETRY_QUEUE_KEY = 'unwrapt_analytics_retry_queue_v1';
const MAX_PROPERTY_COUNT = 20;
const MAX_STRING_LENGTH = 160;
const MAX_QUEUED_EVENTS = 25;
const MAX_RETRY_ATTEMPTS = 3;
const MAX_QUEUE_AGE_MS = 24 * 60 * 60 * 1000;

let retryInProgress = false;

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
      .filter(([key]) => !/email|name|phone|address|token|code|secret/i.test(key))
      .slice(0, MAX_PROPERTY_COUNT)
      .map(([key, value]) => [
        key,
        typeof value === 'string' ? value.slice(0, MAX_STRING_LENGTH) : value,
      ]),
  );

const getReferrerHost = () => {
  if (!document.referrer) return null;

  try {
    return new URL(document.referrer).hostname;
  } catch {
    return null;
  }
};

const getSafePagePath = () => window.location.pathname || '/';

const readRetryQueue = (): QueuedAnalyticsEvent[] => {
  try {
    const stored = window.localStorage.getItem(RETRY_QUEUE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];

    const cutoff = Date.now() - MAX_QUEUE_AGE_MS;
    return parsed
      .filter(
        (event): event is QueuedAnalyticsEvent =>
          Boolean(event?.payload?.event_id) &&
          typeof event.queuedAt === 'number' &&
          event.queuedAt >= cutoff &&
          Number.isInteger(event.attempts) &&
          event.attempts < MAX_RETRY_ATTEMPTS,
      )
      .slice(-MAX_QUEUED_EVENTS);
  } catch {
    return [];
  }
};

const writeRetryQueue = (queue: QueuedAnalyticsEvent[]) => {
  if (queue.length === 0) {
    window.localStorage.removeItem(RETRY_QUEUE_KEY);
    return;
  }

  window.localStorage.setItem(
    RETRY_QUEUE_KEY,
    JSON.stringify(queue.slice(-MAX_QUEUED_EVENTS)),
  );
};

const queueForRetry = (payload: AnalyticsPayload, attempts = 0) => {
  const queue = readRetryQueue();
  const existingIndex = queue.findIndex(
    (event) => event.payload.event_id === payload.event_id,
  );
  const queuedEvent = { payload, attempts, queuedAt: Date.now() };

  if (existingIndex >= 0) queue[existingIndex] = queuedEvent;
  else queue.push(queuedEvent);

  writeRetryQueue(queue);
};

const insertPayload = async (payload: AnalyticsPayload) => {
  const { error } = await supabase
    .from('product_analytics_events' as never)
    .insert(payload as never);

  if (!error || error.code === '23505') return true;

  console.warn('Product analytics delivery failed', {
    eventName: payload.event_name,
    eventId: payload.event_id,
    reason: error.code || 'unknown',
  });
  return false;
};

export const retryQueuedAnalyticsEvents = async () => {
  if (!analyticsAllowed() || retryInProgress) return;

  const queue = readRetryQueue();
  if (queue.length === 0) return;

  retryInProgress = true;
  const remaining: QueuedAnalyticsEvent[] = [];

  try {
    for (const event of queue) {
      const recorded = await insertPayload(event.payload);
      if (!recorded && event.attempts + 1 < MAX_RETRY_ATTEMPTS) {
        remaining.push({ ...event, attempts: event.attempts + 1 });
      }
    }
    writeRetryQueue(remaining);
  } finally {
    retryInProgress = false;
  }
};

export const trackProductEvent = async (
  eventName: string,
  properties: AnalyticsProperties = {},
  experiment?: { key: string; variant: string },
) => {
  if (!analyticsAllowed()) return false;

  const { data } = await supabase.auth.getSession();
  const payload: AnalyticsPayload = {
    event_id: createId(),
    event_name: eventName,
    anonymous_id: getAnonymousId(),
    session_id: getSessionId(),
    user_id: data.session?.user.id ?? null,
    client_created_at: new Date().toISOString(),
    page_path: getSafePagePath(),
    referrer_host: getReferrerHost(),
    properties: cleanProperties(properties),
    experiment_key: experiment?.key ?? null,
    variant: experiment?.variant ?? null,
  };

  const recorded = await insertPayload(payload);
  if (!recorded) queueForRetry(payload);
  else void retryQueuedAnalyticsEvents();

  return recorded;
};

export const trackPageView = (path: string) =>
  trackProductEvent('page_viewed', { path: path.split(/[?#]/, 1)[0] || '/' });

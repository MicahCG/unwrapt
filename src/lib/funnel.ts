/** Conversion-funnel localStorage keys and helpers. */

export const LS_SKIP_AGENT_WELCOME = 'unwrapt_skip_agent_welcome';
export const LS_THEA_VALUE_SEEN = 'thea_value_seen';
export const LS_THEA_UPGRADE_DISMISSED_UNTIL = 'thea_upgrade_dismissed_until';

export const THEA_PREVIEW_MIN_USER_MESSAGES = 2;
export const THEA_UPGRADE_COOLDOWN_DAYS = 7;

export function markSkipAgentWelcome() {
  try {
    localStorage.setItem(LS_SKIP_AGENT_WELCOME, '1');
  } catch {
    /* ignore */
  }
}

export function shouldSkipAgentWelcome(): boolean {
  try {
    return (
      localStorage.getItem(LS_SKIP_AGENT_WELCOME) === '1' ||
      localStorage.getItem('hasSeenIntro') === 'true' ||
      localStorage.getItem('shouldShowOnboardingIntro') === 'true'
    );
  } catch {
    return false;
  }
}

export function clearSkipAgentWelcome() {
  try {
    localStorage.removeItem(LS_SKIP_AGENT_WELCOME);
  } catch {
    /* ignore */
  }
}

export function markTheaValueSeen() {
  try {
    localStorage.setItem(LS_THEA_VALUE_SEEN, '1');
    window.dispatchEvent(new Event('unwrapt:thea-value-seen'));
  } catch {
    /* ignore */
  }
}

export function hasTheaValueSeen(): boolean {
  try {
    return localStorage.getItem(LS_THEA_VALUE_SEEN) === '1';
  } catch {
    return false;
  }
}

export function isTheaUpgradeDismissed(): boolean {
  try {
    const until = localStorage.getItem(LS_THEA_UPGRADE_DISMISSED_UNTIL);
    if (!until) return false;
    return Date.now() < Number(until);
  } catch {
    return false;
  }
}

export function dismissTheaUpgrade(days = THEA_UPGRADE_COOLDOWN_DAYS) {
  try {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(LS_THEA_UPGRADE_DISMISSED_UNTIL, String(until));
  } catch {
    /* ignore */
  }
}

export function isTheaLlmEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  if (normalized.endsWith('@testers.unwrapt.io')) return true;
  return ['kkinyua53@gmail.com', 'giraudelc@gmail.com'].includes(normalized);
}

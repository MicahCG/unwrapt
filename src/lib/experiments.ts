import {
  getAnonymousId,
  trackProductEvent,
} from '@/lib/productAnalytics';

export type ExperimentKey = 'landing_primary_cta_copy_v1';

type ExperimentDefinition = {
  enabled: boolean;
  variants: readonly string[];
};

const EXPERIMENTS: Record<ExperimentKey, ExperimentDefinition> = {
  landing_primary_cta_copy_v1: {
    enabled: import.meta.env.VITE_LANDING_CTA_EXPERIMENT_ENABLED === 'true',
    variants: ['control', 'plan_first_gift'],
  },
};

export const isExperimentEnabled = (key: ExperimentKey) =>
  EXPERIMENTS[key].enabled;

const hash = (value: string) => {
  let result = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }

  return result >>> 0;
};

export const getExperimentVariant = (key: ExperimentKey) => {
  const experiment = EXPERIMENTS[key];
  if (!experiment.enabled) return experiment.variants[0];

  const bucket = hash(`${key}:${getAnonymousId()}`) % experiment.variants.length;
  return experiment.variants[bucket];
};

export const trackExperimentExposure = (
  key: ExperimentKey,
  variant: string,
) => {
  if (!isExperimentEnabled(key)) return;

  const exposureKey = `unwrapt_exposure:${key}:${variant}`;
  if (sessionStorage.getItem(exposureKey) === 'true') return;

  void trackProductEvent(
    'experiment_exposed',
    {},
    { key, variant },
  ).then((recorded) => {
    if (recorded) sessionStorage.setItem(exposureKey, 'true');
  });
};

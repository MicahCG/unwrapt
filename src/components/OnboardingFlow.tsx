import React from 'react';
import AgentOnboardingFlow from '@/components/onboarding2/AgentOnboardingFlow';

interface OnboardingFlowProps {
  /** Invoked after onboarding completes (recipients created). */
  onBack: () => void | Promise<void>;
}

/**
 * Unwrapt 2.0 — agent-first onboarding. Flow: welcome (optional) → connect →
 * people → Thea intel → gift proof → inbox. Budget/autopilot deferred until
 * post-subscribe gift configuration.
 */
const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onBack }) => {
  return <AgentOnboardingFlow onComplete={onBack} />;
};

export default OnboardingFlow;

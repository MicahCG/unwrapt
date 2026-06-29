import React from 'react';
import AgentOnboardingFlow from '@/components/onboarding2/AgentOnboardingFlow';

interface OnboardingFlowProps {
  /** Invoked after onboarding completes (recipients created). */
  onBack: () => void | Promise<void>;
}

/**
 * Unwrapt 2.0 — agent-first onboarding. The whole concierge flow (welcome →
 * connect → found people → Margot intel → living profile → guardrails → trial)
 * lives in AgentOnboardingFlow, which is wired to the existing Supabase logic
 * (Google Calendar import + recipient creation). `onBack` is kept for API
 * compatibility with the previous flow and fires once setup is finished.
 */
const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onBack }) => {
  return <AgentOnboardingFlow onComplete={onBack} />;
};

export default OnboardingFlow;

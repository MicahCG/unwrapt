import React from 'react';
import { Crown, Users, Sparkles, Wallet, Headphones, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: 'recipient_limit' | 'automation_feature';
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, trigger }) => {
  const handleStartTrial = () => {
    // TODO: Implement Stripe checkout flow
    console.log('Starting VIP trial...');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[hsl(var(--ivory))] border-[hsl(var(--cream-border))]">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl text-center text-[hsl(var(--charcoal-text))] mb-6">
            <div className="inline-flex items-center gap-2">
              <Crown className="w-8 h-8 text-[hsl(var(--champagne-gold))]" />
              Upgrade to VIP
            </div>
          </DialogTitle>
        </DialogHeader>

        {trigger === 'recipient_limit' && (
          <p className="text-center text-[hsl(var(--charcoal-text))]/70 mb-6">
            You've reached the 3 recipient limit on the Free plan. Upgrade to VIP for unlimited recipients and more.
          </p>
        )}
        
        {trigger === 'automation_feature' && (
          <p className="text-center text-[hsl(var(--charcoal-text))]/70 mb-6">
            Automation features are only available on VIP. Upgrade to unlock full automation capabilities.
          </p>
        )}

        {/* Comparison Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Free Column */}
          <div className="bg-[hsl(var(--sand))] border border-[hsl(var(--cream-border))] rounded-2xl p-6">
            <h3 className="font-display text-xl text-[hsl(var(--charcoal-text))] mb-4">Free</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-[hsl(var(--charcoal-text))]/60 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[hsl(var(--charcoal-text))]/80">3 recipients max</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-[hsl(var(--charcoal-text))]/60 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[hsl(var(--charcoal-text))]/80">Manual gift scheduling</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-[hsl(var(--charcoal-text))]/60 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[hsl(var(--charcoal-text))]/80">Email reminders</span>
              </div>
            </div>
          </div>

          {/* VIP Column */}
          <div className="bg-gradient-to-br from-[hsl(var(--champagne-gold))]/10 to-[hsl(var(--champagne-gold))]/5 border-2 border-[hsl(var(--champagne-gold))]/30 rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[hsl(var(--champagne-gold))] text-[hsl(var(--charcoal-text))] text-xs font-medium px-3 py-1 rounded-full">
                Recommended
              </span>
            </div>
            <h3 className="font-display text-xl text-[hsl(var(--charcoal-text))] mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-[hsl(var(--champagne-gold))]" />
              VIP
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Users className="w-5 h-5 text-[hsl(var(--champagne-gold))] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[hsl(var(--charcoal-text))] font-medium">Unlimited recipients</span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-[hsl(var(--champagne-gold))] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[hsl(var(--charcoal-text))] font-medium">Full automation</span>
              </div>
              <div className="flex items-start gap-2">
                <Wallet className="w-5 h-5 text-[hsl(var(--champagne-gold))] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[hsl(var(--charcoal-text))] font-medium">Gift wallet access</span>
              </div>
              <div className="flex items-start gap-2">
                <Headphones className="w-5 h-5 text-[hsl(var(--champagne-gold))] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[hsl(var(--charcoal-text))] font-medium">Priority support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="text-center mb-6">
          <div className="font-display text-4xl text-[hsl(var(--charcoal-text))] mb-2">
            $24.99<span className="text-2xl text-[hsl(var(--charcoal-text))]/60">/month</span>
          </div>
          <p className="text-sm text-[hsl(var(--champagne-gold))] font-medium">
            7-day free trial • No commitment
          </p>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleStartTrial}
          className="w-full h-12 bg-[hsl(var(--champagne-gold))] hover:bg-[hsl(var(--champagne-gold))]/90 text-[hsl(var(--charcoal-text))] font-medium text-base rounded-xl"
        >
          <Crown className="w-5 h-5 mr-2" />
          Start Free Trial
        </Button>

        {/* Fine Print */}
        <p className="text-center text-xs text-[hsl(var(--charcoal-text))]/50 mt-4">
          Cancel anytime during trial. No charges until trial ends.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Check, Sparkles, ArrowRight } from 'lucide-react';
import { cleanName } from '@/lib/utils';

interface GiftScheduledSuccessProps {
  recipient: any;
  onComplete: () => void;
  isVisible: boolean;
}

const GiftScheduledSuccess: React.FC<GiftScheduledSuccessProps> = ({ 
  recipient, 
  onComplete, 
  isVisible 
}) => {
  const [phase, setPhase] = useState<'initial' | 'success' | 'moving'>('initial');

  // Extract order number from gift description
  const extractOrderNumber = (description?: string) => {
    if (!description) return null;
    const orderMatch = description.match(/Order: ([^|]+)/);
    return orderMatch?.[1]?.trim() || null;
  };

  const orderNumber = extractOrderNumber(recipient?.recentGift?.gift_description);

  useEffect(() => {
    if (!isVisible) return;
    
    const timer1 = setTimeout(() => {
      setPhase('success');
    }, 300);

    const timer2 = setTimeout(() => {
      setPhase('moving');
    }, 2000);

    const timer3 = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
      <div 
        className={`transform transition-all duration-1000 ease-out ${
          phase === 'initial' 
            ? 'scale-95 opacity-0' 
            : phase === 'success'
            ? 'scale-100 opacity-100'
            : 'scale-110 opacity-0 translate-x-96'
        }`}
      >
        <Card className="bg-white border-brand-cream shadow-2xl max-w-md w-full relative overflow-hidden">
          {/* Success particles animation */}
          {phase === 'success' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-8 animate-bounce">
                <Sparkles className="h-4 w-4 text-yellow-400" />
              </div>
              <div className="absolute top-8 right-12 animate-bounce delay-100">
                <Sparkles className="h-3 w-3 text-blue-400" />
              </div>
              <div className="absolute bottom-8 left-12 animate-bounce delay-200">
                <Sparkles className="h-3 w-3 text-green-400" />
              </div>
              <div className="absolute bottom-4 right-8 animate-bounce delay-300">
                <Sparkles className="h-4 w-4 text-purple-400" />
              </div>
            </div>
          )}
          
          <CardContent className="p-6 text-center">
            {/* Success Icon */}
            <div className={`mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 transition-all duration-500 ${
              phase === 'success' ? 'animate-pulse' : ''
            }`}>
              <Check className="h-8 w-8 text-green-600" />
            </div>

            {/* Success Message */}
            <h3 className="text-xl font-bold text-brand-charcoal mb-2">
              Gift Scheduled! 🎉
            </h3>
            <p className="text-brand-charcoal/70 mb-6">
              Your gift for <span className="font-semibold">{cleanName(recipient.name)}</span> has been scheduled successfully!
            </p>

            {/* Recipient Card */}
            <div className="bg-brand-cream/30 rounded-xl p-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-brand-cream flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-brand-charcoal">
                    {cleanName(recipient.name).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-brand-charcoal">
                    {cleanName(recipient.name)}
                  </h4>
                  <Badge className="bg-green-100 text-green-800 border-green-200 text-xs mt-1">
                    <Check className="h-3 w-3 mr-1" />
                    Gift Scheduled
                  </Badge>
                  {orderNumber && (
                    <div className="mt-2 text-xs font-mono text-brand-charcoal/70 bg-white/60 px-2 py-1 rounded border">
                      Order: {orderNumber}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Moving to upcoming gifts indicator */}
            {phase === 'moving' && (
              <div className="flex items-center justify-center space-x-2 text-brand-charcoal/60">
                <Gift className="h-4 w-4" />
                <ArrowRight className="h-4 w-4 animate-pulse" />
                <span className="text-sm">Moving to Upcoming Gifts...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GiftScheduledSuccess;
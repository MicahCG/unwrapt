import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Wallet, Gift, CheckCircle, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatOccasionDate } from '@/lib/dateUtils';
import { GIFT_VIBE_OPTIONS, type GiftVibe } from '@/lib/giftVibes';
import { cn } from '@/lib/utils';

interface VIPWelcomeModalProps {
  open: boolean;
  onComplete: () => void;
}

const PRESET_AMOUNTS = [100, 200, 300];

export const VIPWelcomeModal = ({ open, onComplete }: VIPWelcomeModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 2: Wallet funding
  const [selectedAmount, setSelectedAmount] = useState(200);
  const [customAmount, setCustomAmount] = useState('');

  // Step 3: Recipient setup
  const [upcomingRecipients, setUpcomingRecipients] = useState<any[]>([]);
  const [recipientSetup, setRecipientSetup] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open && step === 3) {
      loadUpcomingRecipients();
    }
  }, [open, step]);

  const loadUpcomingRecipients = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('recipients')
      .select('*')
      .eq('user_id', user.id)
      .not('birthday', 'is', null)
      .order('birthday', { ascending: true })
      .limit(3);

    if (error) {
      console.error('Error loading recipients:', error);
      return;
    }

    setUpcomingRecipients(data || []);

    // Initialize setup state
    const setup: Record<string, any> = {};
    data?.forEach(r => {
      setup[r.id] = {
        giftVibe: r.preferred_gift_vibe || null,
        enableAutomation: true
      };
    });
    setRecipientSetup(setup);
  };

  const handleAddFunds = async () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;

    if (amount < 50) {
      toast({
        title: 'Minimum $50',
        description: 'Please add at least $50 to your wallet',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wallet-add-funds', {
        body: { amount }
      });

      if (error) throw error;

      if (data?.url) {
        // Store that we're in onboarding
        sessionStorage.setItem('vipOnboardingStep', '2');
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error adding funds:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to initialize payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipFunding = () => {
    setStep(3);
  };

  const updateRecipientSetup = (recipientId: string, field: string, value: any) => {
    setRecipientSetup(prev => ({
      ...prev,
      [recipientId]: {
        ...prev[recipientId],
        [field]: value
      }
    }));
  };

  const setGiftVibe = (recipientId: string, vibe: GiftVibe) => {
    updateRecipientSetup(recipientId, 'giftVibe', vibe);
  };

  const handleEnableAutomation = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update recipients with gift vibe preference
      for (const recipient of upcomingRecipients) {
        const setup = recipientSetup[recipient.id];
        if (!setup.enableAutomation) continue;

        // Update recipient with gift vibe preference
        if (setup.giftVibe) {
          await supabase
            .from('recipients')
            .update({
              preferred_gift_vibe: setup.giftVibe
            })
            .eq('id', recipient.id);
        }

        // Create scheduled gift with automation
        const { error: giftError } = await supabase
          .from('scheduled_gifts')
          .upsert({
            recipient_id: recipient.id,
            user_id: user.id,
            occasion: 'Birthday',
            occasion_date: recipient.birthday,
            occasion_type: 'birthday',
            automation_enabled: true,
            gift_vibe: setup.giftVibe || 'CALM_COMFORT',
            status: 'pending',
            delivery_date: new Date(new Date(recipient.birthday).getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }, {
            onConflict: 'recipient_id,occasion_date'
          });

        if (giftError) {
          console.error('Error creating scheduled gift:', giftError);
          throw giftError;
        }
      }

      // Mark onboarding complete
      await supabase
        .from('profiles')
        .update({ vip_onboarding_completed: true })
        .eq('id', user.id);

      setStep(4);
    } catch (error: any) {
      console.error('Error enabling automation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to enable automation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-[#D2B887] to-[#B8986C] rounded-full flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-white" />
      </div>

      <h2 className="font-display text-3xl text-[#1A1A1A] mb-4">
        Welcome to VIP!
      </h2>

      <p className="text-[#1A1A1A]/70 mb-8 max-w-md mx-auto">
        You now have access to our complete automation suite
      </p>

      <div className="space-y-4 mb-8">
        <div className="flex items-start gap-3 text-left">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-[#1A1A1A]">Unlimited Recipients</p>
            <p className="text-sm text-[#1A1A1A]/60">Never forget another special occasion</p>
          </div>
        </div>

        <div className="flex items-start gap-3 text-left">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-[#1A1A1A]">Automatic Gift Scheduling</p>
            <p className="text-sm text-[#1A1A1A]/60">We handle everything, from selection to delivery</p>
          </div>
        </div>

        <div className="flex items-start gap-3 text-left">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-[#1A1A1A]">Gift Wallet with Auto-Reload</p>
            <p className="text-sm text-[#1A1A1A]/60">Never run out of funds for upcoming gifts</p>
          </div>
        </div>

        <div className="flex items-start gap-3 text-left">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-[#1A1A1A]">Priority Support</p>
            <p className="text-sm text-[#1A1A1A]/60">Get help whenever you need it</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-[#1A1A1A]/60 mb-6">
        Let's get you set up in 3 easy steps
      </p>

      <Button
        onClick={() => setStep(2)}
        className="bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
        size="lg"
      >
        Get Started
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );

  const renderStep2 = () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
    const estimatedGifts = Math.floor(amount / 43);

    return (
      <div className="py-6">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 bg-[#D2B887]/20 rounded-full flex items-center justify-center">
            <Wallet className="w-6 h-6 text-[#D2B887]" />
          </div>

          <h2 className="font-display text-2xl text-[#1A1A1A] mb-2">
            Fund Your Gift Wallet
          </h2>

          <p className="text-sm text-[#1A1A1A]/70">
            Your wallet covers upcoming gifts automatically. No last-minute stress!
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="text-sm text-[#1A1A1A]/70 mb-3 block">
              Select Amount
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {PRESET_AMOUNTS.map((presetAmount) => (
                <Button
                  key={presetAmount}
                  variant={selectedAmount === presetAmount && !customAmount ? 'default' : 'outline'}
                  className={
                    selectedAmount === presetAmount && !customAmount
                      ? 'bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]'
                      : 'border-[#E4DCD2]'
                  }
                  onClick={() => {
                    setSelectedAmount(presetAmount);
                    setCustomAmount('');
                  }}
                >
                  ${presetAmount}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm text-[#1A1A1A]/70 mb-2 block">
              Or Custom Amount
            </Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(0);
              }}
              className="border-[#E4DCD2]"
            />
          </div>

          {amount >= 50 && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Covers ~{estimatedGifts} gifts</strong> at $43/each average
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <Button
            variant="outline"
            onClick={handleSkipFunding}
            className="flex-1"
          >
            Skip for now
          </Button>
          <Button
            onClick={handleAddFunds}
            disabled={loading || amount < 50}
            className="flex-1 bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Add ${amount}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="py-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-4 bg-[#D2B887]/20 rounded-full flex items-center justify-center">
          <Gift className="w-6 h-6 text-[#D2B887]" />
        </div>

        <h2 className="font-display text-2xl text-[#1A1A1A] mb-2">
          Set Gift Preferences
        </h2>

        <p className="text-sm text-[#1A1A1A]/70">
          Choose the vibe for each person's gifts. We'll quietly handle the rest.
        </p>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {upcomingRecipients.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#1A1A1A]/60 mb-4">
              No upcoming occasions found. Add recipients with birthdaydates to get started!
            </p>
            <Button
              onClick={() => setStep(4)}
              variant="outline"
            >
              Skip to Dashboard
            </Button>
          </div>
        ) : (
          upcomingRecipients.map((recipient) => (
            <div
              key={recipient.id}
              className="p-4 bg-[#FAF8F3] rounded-xl border border-[#E4DCD2]"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-[#1A1A1A]">
                    {recipient.name}'s Birthday
                  </h3>
                  <p className="text-sm text-[#1A1A1A]/60">
                    {formatOccasionDate(recipient.birthday)}
                  </p>
                </div>
                <Badge
                  variant={recipientSetup[recipient.id]?.enableAutomation ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => updateRecipientSetup(
                    recipient.id,
                    'enableAutomation',
                    !recipientSetup[recipient.id]?.enableAutomation
                  )}
                >
                  {recipientSetup[recipient.id]?.enableAutomation ? '✓ Enable' : 'Skip'}
                </Badge>
              </div>

              {recipientSetup[recipient.id]?.enableAutomation && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-[#1A1A1A]/60 mb-3 block">
                      What kind of gifts do they usually love?
                    </Label>
                    <div className="space-y-2">
                      {GIFT_VIBE_OPTIONS.map((option) => (
                        <div
                          key={option.vibe}
                          onClick={() => setGiftVibe(recipient.id, option.vibe)}
                          className={cn(
                            "p-4 rounded-lg border-2 cursor-pointer transition-all",
                            recipientSetup[recipient.id]?.giftVibe === option.vibe
                              ? "border-[#D2B887] bg-[#D2B887]/10"
                              : "border-[#E4DCD2] hover:border-[#D2B887]/50 bg-white"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0",
                              recipientSetup[recipient.id]?.giftVibe === option.vibe
                                ? "border-[#D2B887] bg-[#D2B887]"
                                : "border-[#E4DCD2]"
                            )}>
                              {recipientSetup[recipient.id]?.giftVibe === option.vibe && (
                                <CheckCircle className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-[#1A1A1A] mb-1">{option.label}</p>
                              <p className="text-xs text-[#1A1A1A]/60">{option.description}</p>
                              <p className="text-xs text-[#1A1A1A]/40 mt-1">{option.examples}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-[#1A1A1A]/50 mt-2">
                      You can skip this for now. We'll choose a cozy, universally loved gift by default.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button
          variant="outline"
          onClick={() => setStep(2)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleEnableAutomation}
          disabled={loading || upcomingRecipients.length === 0}
          className="flex-1 bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enabling...
            </>
          ) : (
            <>
              Enable Automation
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>

      <h2 className="font-display text-3xl text-[#1A1A1A] mb-4">
        You're All Set!
      </h2>

      <p className="text-[#1A1A1A]/70 mb-8">
        We'll handle everything for your upcoming occasions
      </p>

      <div className="space-y-3 mb-8 text-left max-w-md mx-auto">
        <div className="flex gap-3">
          <div className="text-2xl">📅</div>
          <div>
            <p className="font-medium text-[#1A1A1A]">14 days before</p>
            <p className="text-sm text-[#1A1A1A]/60">We reserve funds from your wallet</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="text-2xl">📬</div>
          <div>
            <p className="font-medium text-[#1A1A1A]">10 days before</p>
            <p className="text-sm text-[#1A1A1A]/60">You'll confirm the shipping address</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="text-2xl">📦</div>
          <div>
            <p className="font-medium text-[#1A1A1A]">3 days before</p>
            <p className="text-sm text-[#1A1A1A]/60">Gift ships and arrives on time</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-[#1A1A1A]/60 mb-6">
        You can customize gifts anytime from your dashboard
      </p>

      <Button
        onClick={onComplete}
        className="bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
        size="lg"
      >
        Go to Dashboard
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onComplete()}>
      <DialogContent className="max-w-2xl bg-[#FAF8F3] border-[#E4DCD2]">
        <div className="relative">
          {/* Progress indicator */}
          {step < 4 && (
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 w-12 rounded-full transition-colors ${
                    s <= step ? 'bg-[#D2B887]' : 'bg-[#E4DCD2]'
                  }`}
                />
              ))}
            </div>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

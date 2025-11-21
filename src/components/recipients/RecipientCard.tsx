import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock, Zap } from 'lucide-react';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import AutomationSetupModal from '@/components/automation/AutomationSetupModal';
import { toggleRecipientAutomation } from '@/lib/automation';
import { toast } from '@/hooks/use-toast';

interface RecipientCardProps {
  recipient: any;
  userTier: 'free' | 'vip';
  onEdit: () => void;
  onScheduleGift: () => void;
  onDelete: () => void;
}

export const RecipientCard = ({
  recipient,
  userTier,
  onEdit,
  onScheduleGift,
  onDelete,
}: RecipientCardProps) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAutomationSetup, setShowAutomationSetup] = useState(false);
  const [isTogglingAutomation, setIsTogglingAutomation] = useState(false);
  
  const hasAutomation = recipient.scheduled_gifts?.some(
    (gift: any) => gift.automation_enabled
  );

  const handleAutomationToggle = async (enabled: boolean) => {
    if (userTier === 'free') {
      setShowUpgradeModal(true);
      return;
    }

    if (enabled) {
      // Show setup modal for VIP users
      setShowAutomationSetup(true);
    } else {
      // Disable automation
      setIsTogglingAutomation(true);
      try {
        await toggleRecipientAutomation(recipient.id, false);
        toast({
          title: 'Automation Disabled',
          description: `Automation has been turned off for ${recipient.name}`,
        });
      } catch (error) {
        console.error('Error disabling automation:', error);
        toast({
          title: 'Error',
          description: 'Failed to disable automation. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsTogglingAutomation(false);
      }
    }
  };

  return (
    <>
      <Card className="border-[#E4DCD2] hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg text-[#1A1A1A]">
                {recipient.name}
              </CardTitle>
              {recipient.relationship && (
                <Badge variant="secondary" className="mt-1">
                  {recipient.relationship}
                </Badge>
              )}
            </div>
            {hasAutomation && (
              <Badge className="bg-[#D2B887]/20 text-[#D2B887] border-[#D2B887]/30">
                <Zap className="w-3 h-3 mr-1" />
                Auto
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Recipient details */}
          {recipient.email && (
            <p className="text-sm text-[#1A1A1A]/70">{recipient.email}</p>
          )}

          {/* Automation Toggle */}
          <div className="flex items-center justify-between p-3 bg-[#EFE7DD] rounded-lg border border-[#E4DCD2]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#1A1A1A]">
                Automation
              </span>
              {userTier === 'free' && (
                <Lock className="w-3 h-3 text-[#1A1A1A]/50" />
              )}
            </div>
            
            {userTier === 'free' ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Switch
                        checked={false}
                        disabled
                        onCheckedChange={() => setShowUpgradeModal(true)}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upgrade to VIP to enable automation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Switch
                checked={hasAutomation}
                onCheckedChange={handleAutomationToggle}
                disabled={isTogglingAutomation}
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onEdit}
            >
              Edit
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
              onClick={onScheduleGift}
            >
              Schedule Gift
            </Button>
          </div>
        </CardContent>
      </Card>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        trigger="automation_feature"
      />

      {showAutomationSetup && (
        <AutomationSetupModal
          isOpen={showAutomationSetup}
          onClose={() => setShowAutomationSetup(false)}
          recipient={recipient}
        />
      )}
    </>
  );
};

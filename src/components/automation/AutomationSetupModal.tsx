import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useShopifyCollection } from "@/hooks/useShopifyCollection";
import { Loader2, Check, AlertCircle, Wallet as WalletIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AutomationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: any;
  onSuccess?: () => void;
}

export const AutomationSetupModal = ({ isOpen, onClose, recipient, onSuccess }: AutomationSetupModalProps) => {
  const [currentStep, setCurrentStep] = useState<"select-gift" | "confirm">("select-gift");
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [isEnabling, setIsEnabling] = useState(false);
  const [nextGiftCost, setNextGiftCost] = useState<number>(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all products
  const { data: products = [], isLoading: productsLoading } = useShopifyCollection("", 50);

  // Fetch user profile (wallet balance and tier)
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("gift_wallet_balance, subscription_tier")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch next upcoming gift for this recipient
  const { data: nextGift } = useQuery({
    queryKey: ["next-gift", recipient?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !recipient?.id) return null;

      const { data, error } = await supabase
        .from("scheduled_gifts")
        .select("*")
        .eq("recipient_id", recipient.id)
        .eq("user_id", user.id)
        .eq("payment_status", "unpaid")
        .gte("occasion_date", new Date().toISOString().split("T")[0])
        .order("occasion_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) console.error("Error fetching next gift:", error);
      return data;
    },
    enabled: isOpen && !!recipient?.id,
  });

  // Calculate gift cost when gift is selected
  useEffect(() => {
    if (selectedGift) {
      const price = parseFloat(selectedGift.price || "0");
      setNextGiftCost(price + 7); // Add $7 service fee
    }
  }, [selectedGift]);

  const handleGiftSelect = (product: any) => {
    setSelectedGift(product);
    setCurrentStep("confirm");
  };

  const handleEnableAutomation = async () => {
    if (!selectedGift || !userProfile) return;

    // Validation checks
    if (userProfile.subscription_tier !== "vip") {
      toast({
        title: "VIP Required",
        description: "Automation is only available for VIP members.",
        variant: "destructive",
      });
      return;
    }

    if (!nextGift) {
      toast({
        title: "No Upcoming Gifts",
        description: "This recipient needs at least one scheduled gift to enable automation.",
        variant: "destructive",
      });
      return;
    }

    const availableBalance = userProfile.gift_wallet_balance || 0;
    if (availableBalance < nextGiftCost) {
      toast({
        title: "Insufficient Funds",
        description: `You need at least $${nextGiftCost.toFixed(2)} in your wallet to enable automation.`,
        variant: "destructive",
      });
      return;
    }

    setIsEnabling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const variantId = selectedGift.variantId;

      // Update recipient with default gift and enable automation
      const { error: recipientError } = await supabase
        .from("recipients")
        .update({
          default_gift_variant_id: variantId,
          automation_enabled: true,
        })
        .eq("id", recipient.id);

      if (recipientError) throw recipientError;

      // Enable automation for all future scheduled gifts
      const { error: giftsError } = await supabase
        .from("scheduled_gifts")
        .update({ automation_enabled: true })
        .eq("recipient_id", recipient.id)
        .eq("user_id", user.id)
        .gte("occasion_date", new Date().toISOString().split("T")[0]);

      if (giftsError) throw giftsError;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["recipients"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });

      toast({
        title: "Automation Enabled! 🎉",
        description: `All future gifts for ${recipient.name} will be automated with ${selectedGift.title}`,
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error enabling automation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to enable automation",
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const walletBalance = userProfile?.gift_wallet_balance || 0;
  const hasSufficientFunds = walletBalance >= nextGiftCost;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#FAF8F3] border-[#E4DCD2]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-[#1A1A1A]">
            {currentStep === "select-gift" 
              ? `Step 1: Pick a Default Gift for ${recipient?.name}` 
              : "Step 2: Check Wallet Balance"}
          </DialogTitle>
          <DialogDescription className="text-[#1A1A1A]/70">
            {currentStep === "select-gift"
              ? "This gift will be used for all future automated occasions."
              : "Make sure you have enough funds to enable automation."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-gift" && (
          <div className="py-4">
            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#D2B887]" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
                {products.map((product) => (
                  <button
                    key={product.variantId}
                    onClick={() => handleGiftSelect(product)}
                    className="group relative bg-white border-2 border-[#E4DCD2] rounded-lg p-3 hover:border-[#D2B887] transition-all"
                  >
                    <img
                      src={product.featuredImage || ""}
                      alt={product.title}
                      className="w-full h-32 object-cover rounded-md mb-2"
                    />
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">
                      {product.title}
                    </p>
                    <p className="text-xs text-[#1A1A1A]/70">
                      ${product.price.toFixed(2)} + $7 fee
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === "confirm" && selectedGift && (
          <div className="space-y-6 py-4">
            <div className="border-2 border-[#E4DCD2] rounded-lg p-4 bg-[#EFE7DD]">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-[#1A1A1A]">
                <Check className="w-5 h-5 text-green-600" />
                Selected Gift
              </h3>
              <div className="flex items-center gap-4">
                {selectedGift.featuredImage && (
                  <img
                    src={selectedGift.featuredImage}
                    alt={selectedGift.title}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-lg text-[#1A1A1A]">{selectedGift.title}</p>
                  <p className="text-sm text-[#1A1A1A]/70 mt-1">
                    Gift Price: ${selectedGift.price.toFixed(2)}
                  </p>
                  <p className="text-sm text-[#1A1A1A]/70">
                    Service Fee: $7.00
                  </p>
                  <p className="text-sm font-semibold mt-1 text-[#1A1A1A]">
                    Total per gift: ${nextGiftCost.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {nextGift && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  Next upcoming occasion: <strong>{nextGift.occasion}</strong> on{" "}
                  {new Date(nextGift.occasion_date).toLocaleDateString()}
                </AlertDescription>
              </Alert>
            )}

            <div className={`border-2 rounded-lg p-4 ${hasSufficientFunds ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                {hasSufficientFunds ? (
                  <>
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-green-900">Your Wallet Balance</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-900">Your Wallet Balance</span>
                  </>
                )}
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <WalletIcon className={`w-6 h-6 ${hasSufficientFunds ? "text-green-600" : "text-red-600"}`} />
                <p className="text-3xl font-bold text-[#1A1A1A]">
                  ${walletBalance.toFixed(2)}
                </p>
              </div>
              {hasSufficientFunds ? (
                <p className="text-sm text-green-700 mt-2 font-medium">
                  ✓ You have enough funds to enable automation!
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-red-700 font-medium">
                    You need at least ${nextGiftCost.toFixed(2)} to enable automation.
                  </p>
                  <p className="text-sm text-red-600">
                    Please add ${(nextGiftCost - walletBalance).toFixed(2)} more to your wallet.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("select-gift")}
                disabled={isEnabling}
                className="border-[#E4DCD2] text-[#1A1A1A] hover:bg-[#EFE7DD]"
              >
                Back
              </Button>
              {hasSufficientFunds ? (
                <Button
                  onClick={handleEnableAutomation}
                  disabled={isEnabling}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isEnabling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    "Enable Automation"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    onClose();
                    // Could trigger add funds modal here
                  }}
                  className="flex-1 bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
                >
                  Add Funds to Wallet
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AutomationSetupModal;

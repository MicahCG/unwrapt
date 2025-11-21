import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const AutoReloadSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile-auto-reload"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("auto_reload_enabled, auto_reload_threshold, auto_reload_amount, stripe_payment_method_id")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const [autoReloadEnabled, setAutoReloadEnabled] = useState(profile?.auto_reload_enabled || false);
  const [reloadThreshold, setReloadThreshold] = useState(profile?.auto_reload_threshold || 50);
  const [reloadAmount, setReloadAmount] = useState(profile?.auto_reload_amount || 100);

  const hasPaymentMethod = !!profile?.stripe_payment_method_id;

  const handleToggle = async (enabled: boolean) => {
    if (enabled && !hasPaymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please add a payment method before enabling auto-reload.",
        variant: "destructive",
      });
      return;
    }

    setAutoReloadEnabled(enabled);
    await handleSave(enabled);
  };

  const handleSave = async (enabled?: boolean) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          auto_reload_enabled: enabled !== undefined ? enabled : autoReloadEnabled,
          auto_reload_threshold: reloadThreshold,
          auto_reload_amount: reloadAmount,
        })
        .eq("id", user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-profile-auto-reload"] });

      toast({
        title: "Settings Saved",
        description: "Auto-reload settings updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving auto-reload settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-Reload Wallet</CardTitle>
        <CardDescription>
          Automatically add funds when your balance gets low to keep automations running smoothly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasPaymentMethod && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="text-amber-900">
              Please add a payment method to enable auto-reload functionality.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-reload-toggle" className="text-base">
              Enable Auto-Reload
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically charge your saved payment method
            </p>
          </div>
          <Switch
            id="auto-reload-toggle"
            checked={autoReloadEnabled}
            onCheckedChange={handleToggle}
            disabled={!hasPaymentMethod || isSaving}
          />
        </div>

        {autoReloadEnabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="reload-threshold">
                Reload when balance drops below
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold">$</span>
                <Input
                  id="reload-threshold"
                  type="number"
                  min="10"
                  max="500"
                  step="10"
                  value={reloadThreshold}
                  onChange={(e) => setReloadThreshold(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reload-amount">
                Reload amount
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold">$</span>
                <Input
                  id="reload-amount"
                  type="number"
                  min="20"
                  max="1000"
                  step="10"
                  value={reloadAmount}
                  onChange={(e) => setReloadAmount(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>

            {hasPaymentMethod && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="w-4 h-4" />
                <span>Payment method on file</span>
              </div>
            )}

            <Button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

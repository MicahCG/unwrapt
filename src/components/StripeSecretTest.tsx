import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const StripeSecretTest = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testStripeSecret = async () => {
    setTesting(true);
    setError(null);
    setResult(null);

    try {
      console.log("🧪 Testing Stripe secret access...");
      
      const { data, error: functionError } = await supabase.functions.invoke('test-stripe-secret');
      
      if (functionError) {
        console.error("Function error:", functionError);
        setError(`Function error: ${functionError.message}`);
        return;
      }

      console.log("Test result:", data);
      setResult(data);

    } catch (err) {
      console.error("Test failed:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Stripe Secret Diagnostic Test</CardTitle>
        <CardDescription>
          Test the Stripe secret key propagation to edge functions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testStripeSecret} 
          disabled={testing}
          className="w-full"
        >
          {testing ? "Testing..." : "Test Stripe Secret"}
        </Button>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <h4 className="font-semibold text-destructive mb-2">Error:</h4>
            <pre className="text-sm whitespace-pre-wrap text-destructive">{error}</pre>
          </div>
        )}

        {result && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Test Result:</h4>
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
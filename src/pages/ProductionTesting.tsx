
import React from 'react';
import ProductionTestDashboard from '@/components/ProductionTestDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, ExternalLink } from 'lucide-react';

const ProductionTesting = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-brand-charcoal">Production Testing</h1>
        <p className="text-brand-charcoal/70">
          Test your deployed edge functions safely without real purchases or charges
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Safe Testing:</strong> All tests use test modes, mock data, and Stripe's test card numbers. 
          No real purchases or charges will be made during testing.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProductionTestDashboard />
        </div>
        
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Testing Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold mb-1">Stripe Testing</h4>
                <p className="text-muted-foreground">
                  Uses Stripe's test mode with test card numbers. No real charges are made.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-1">Shopify Testing</h4>
                <p className="text-muted-foreground">
                  Tests product matching logic without creating actual orders in your store.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-1">Email Testing</h4>
                <p className="text-muted-foreground">
                  Sends test emails to verify your email service integration.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Card Numbers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="bg-gray-50 p-2 rounded">
                <p className="font-mono">4242 4242 4242 4242</p>
                <p className="text-xs text-muted-foreground">Visa - Always succeeds</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="font-mono">4000 0000 0000 0002</p>
                <p className="text-xs text-muted-foreground">Card declined</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="font-mono">4000 0000 0000 9995</p>
                <p className="text-xs text-muted-foreground">Insufficient funds</p>
              </div>
              <a 
                href="https://stripe.com/docs/testing#cards" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
              >
                View all test cards <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Monitor your edge function logs in the Supabase dashboard to see detailed execution information.
              </p>
              <a 
                href={`https://supabase.com/dashboard/project/da282060-2b72-4dcb-96f4-c65e9fffdc8d/functions`}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
              >
                View Function Logs <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductionTesting;

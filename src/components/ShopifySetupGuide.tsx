import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Key, Store, Tag } from 'lucide-react';

const ShopifySetupGuide: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Shopify Configuration Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Key className="w-4 h-4" />
            <AlertDescription>
              To enable dynamic product fetching, please configure your Shopify Storefront API access token.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="font-semibold">Setup Steps:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to your Shopify Admin → Apps → Manage private apps</li>
              <li>Create a new private app or edit existing one</li>
              <li>Enable Storefront API access</li>
              <li>Copy the Storefront Access Token</li>
              <li>Add it to your Supabase Edge Function secrets</li>
            </ol>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Required Collections Setup:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Badge variant="outline">gifts-all</Badge>
                <p className="text-xs text-muted-foreground">Tag: unwrapt</p>
              </div>
              <div className="space-y-2">
                <Badge variant="outline">gifts-candles</Badge>
                <p className="text-xs text-muted-foreground">Tags: unwrapt, candle</p>
              </div>
              <div className="space-y-2">
                <Badge variant="outline">gifts-chocolate</Badge>
                <p className="text-xs text-muted-foreground">Tags: unwrapt, chocolate</p>
              </div>
              <div className="space-y-2">
                <Badge variant="outline">gifts-coffee</Badge>
                <p className="text-xs text-muted-foreground">Tags: unwrapt, coffee</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Product Metafields (namespace: unwrapt):</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Tag className="w-3 h-3" />
                <code>category</code> - Product category (e.g., candles, chocolate)
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-3 h-3" />
                <code>rank</code> - Sort order (number, lower = higher priority)
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-3 h-3" />
                <code>badge</code> - Optional badge text (e.g., "Ships Fast", "Staff Pick")
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopifySetupGuide;
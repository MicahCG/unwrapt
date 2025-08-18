import React from 'react';
import { StripeSecretTest } from '@/components/StripeSecretTest';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, ResponsiveHeader } from '@/components/ui/responsive-container';
import { Logo } from '@/components/ui/logo';
import UserMenu from '@/components/auth/UserMenu';

const Testing = () => {
  return (
    <ResponsiveContainer>
      <ResponsiveHeader>
        <div className="flex items-center gap-4">
          <Logo className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Testing Dashboard</h1>
            <p className="text-sm text-muted-foreground">Diagnostic tools and tests</p>
          </div>
        </div>
        <UserMenu />
      </ResponsiveHeader>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Testing Dashboard</CardTitle>
              <CardDescription>
                Diagnostic tools for debugging and testing various integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <StripeSecretTest />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ResponsiveContainer>
  );
};

export default Testing;
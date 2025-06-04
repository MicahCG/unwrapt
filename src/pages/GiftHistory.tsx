
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Home, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppNavigation from '@/components/AppNavigation';
import { ResponsiveContainer, ResponsiveHeader, ResponsiveNavigation, ResponsiveActions } from '@/components/ui/responsive-container';

const GiftHistory = () => {
  const navigate = useNavigate();

  return (
    <ResponsiveContainer>
      <ResponsiveHeader>
        <ResponsiveNavigation>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light w-full sm:w-auto"
          >
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <AppNavigation />
        </ResponsiveNavigation>

        <ResponsiveActions>
          <Button
            variant="outline"
            onClick={() => navigate('/settings')}
            className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </ResponsiveActions>
      </ResponsiveHeader>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center text-brand-charcoal text-lg sm:text-xl">
            <Package className="h-5 w-5 mr-2 flex-shrink-0" />
            Gift History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 sm:py-12">
            <Package className="h-12 w-12 sm:h-16 sm:w-16 text-brand-charcoal/30 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-brand-charcoal mb-2">
              Gift History Coming Soon
            </h3>
            <p className="text-sm sm:text-base text-brand-charcoal/70 max-w-md mx-auto">
              View all your past gifts and delivery history
            </p>
          </div>
        </CardContent>
      </Card>
    </ResponsiveContainer>
  );
};

export default GiftHistory;

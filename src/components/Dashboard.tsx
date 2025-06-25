
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UserMenu from '@/components/auth/UserMenu';
import TestDataManager from '@/components/TestDataManager';
import UpcomingGiftsManager from '@/components/UpcomingGiftsManager';
import DashboardRecipients from '@/components/DashboardRecipients';
import HolidayCarousel from '@/components/HolidayCarousel';
import { ResponsiveContainer, ResponsiveHeader, ResponsiveNavigation, ResponsiveActions } from '@/components/ui/responsive-container';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <ResponsiveContainer>
      <ResponsiveHeader>
        <ResponsiveNavigation>
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-charcoal">Welcome back!</h1>
              <p className="text-brand-charcoal/70 mt-1 text-sm sm:text-base">Here's what's happening with your gifting schedule</p>
            </div>
          </div>
        </ResponsiveNavigation>

        <ResponsiveActions>
          <UserMenu />
        </ResponsiveActions>
      </ResponsiveHeader>

      {/* Development Test Data Manager */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6 sm:mb-8">
          <TestDataManager />
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        <div className="w-full order-1 xl:order-1">
          <DashboardRecipients />
        </div>
        <div className="w-full order-2 xl:order-2">
          <UpcomingGiftsManager />
        </div>
      </div>

      {/* Holiday Carousel */}
      <div className="mb-6 sm:mb-8">
        <HolidayCarousel />
      </div>
    </ResponsiveContainer>
  );
};

export default Dashboard;


import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Users, 
  Gift, 
  Calendar, 
  Settings, 
  CreditCard,
  Package,
  BarChart3,
  Heart,
  Bell,
  UserPlus
} from 'lucide-react';

const AppNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { 
      title: 'Dashboard', 
      path: '/', 
      icon: Home, 
      description: 'Main dashboard overview' 
    },
    { 
      title: 'Onboarding', 
      path: '/onboarding', 
      icon: UserPlus, 
      description: 'Setup and onboarding flow' 
    },
    { 
      title: 'Recipients', 
      path: '/?tab=recipients', 
      icon: Users, 
      description: 'Manage your gift recipients' 
    },
    { 
      title: 'Upcoming Gifts', 
      path: '/?tab=gifts', 
      icon: Gift, 
      description: 'View and manage scheduled gifts' 
    },
    { 
      title: 'Calendar View', 
      path: '/calendar', 
      icon: Calendar, 
      description: 'See all occasions in calendar format' 
    },
    { 
      title: 'Gift History', 
      path: '/history', 
      icon: Package, 
      description: 'Past gifts and deliveries' 
    },
    { 
      title: 'Analytics', 
      path: '/analytics', 
      icon: BarChart3, 
      description: 'Spending and gifting insights' 
    },
    { 
      title: 'Wishlist', 
      path: '/wishlist', 
      icon: Heart, 
      description: 'Saved gift ideas' 
    },
    { 
      title: 'Notifications', 
      path: '/notifications', 
      icon: Bell, 
      description: 'Alerts and reminders' 
    },
    { 
      title: 'Payment Success', 
      path: '/payment-success', 
      icon: CreditCard, 
      description: 'Payment confirmation page' 
    },
    { 
      title: 'Settings', 
      path: '/settings', 
      icon: Settings, 
      description: 'Account and preferences' 
    }
  ];

  const handleNavigate = (path: string) => {
    if (path.includes('?tab=')) {
      const [basePath, params] = path.split('?');
      const searchParams = new URLSearchParams(params);
      navigate(basePath, { replace: true });
      // Handle tab switching for dashboard
      if (basePath === '/') {
        const tab = searchParams.get('tab');
        if (tab) {
          // Trigger tab change event or use a state management solution
          window.dispatchEvent(new CustomEvent('changeTab', { detail: tab }));
        }
      }
    } else {
      navigate(path);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' && !location.search;
    if (path.includes('?tab=')) {
      const [basePath, params] = path.split('?');
      const searchParams = new URLSearchParams(params);
      const tab = searchParams.get('tab');
      return location.pathname === basePath && location.search.includes(`tab=${tab}`);
    }
    return location.pathname === path;
  };

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-white border border-gray-200 text-brand-charcoal hover:bg-brand-cream-light">
            Quick Navigation
          </NavigationMenuTrigger>
          <NavigationMenuContent className="bg-white border border-gray-200 shadow-lg">
            <div className="grid gap-2 p-4 w-80">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className={`justify-start h-auto p-3 ${
                      active 
                        ? 'bg-brand-gold/20 text-brand-charcoal font-medium' 
                        : 'hover:bg-brand-cream-light text-brand-charcoal/80'
                    }`}
                    onClick={() => handleNavigate(item.path)}
                  >
                    <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-brand-charcoal/60">
                        {item.description}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default AppNavigation;

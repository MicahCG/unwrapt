
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
  Package,
  Settings, 
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
      title: 'Gift History', 
      path: '/gift-history', 
      icon: Package, 
      description: 'Past gifts and deliveries' 
    },
    { 
      title: 'Settings', 
      path: '/settings', 
      icon: Settings, 
      description: 'Account and preferences' 
    },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => location.pathname === path;

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
                    key={`${item.path}-${item.title}`}
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

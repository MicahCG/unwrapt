
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';

const UserMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const userInitial = user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U';

  const handleSettingsClick = () => {
    console.log('🔧 UserMenu: Navigating to settings');
    navigate('/settings');
  };

  const handleSignOut = async () => {
    console.log('🔧 UserMenu: Signing out');
    await signOut();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-8 w-8 rounded-full text-brand-charcoal hover:bg-brand-cream hover:text-brand-charcoal"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name} />
            <AvatarFallback className="bg-brand-charcoal text-brand-cream">
              {userInitial}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-56 bg-white border-brand-cream text-brand-charcoal" 
        align="end" 
        forceMount
      >
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium text-brand-charcoal">
              {user.user_metadata?.full_name}
            </p>
            <p className="w-[200px] truncate text-sm text-brand-charcoal/70">
              {user.email}
            </p>
          </div>
        </div>
        <DropdownMenuItem 
          onClick={handleSettingsClick}
          className="text-brand-charcoal hover:bg-brand-cream hover:text-brand-charcoal cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="text-brand-charcoal hover:bg-brand-cream hover:text-brand-charcoal cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;

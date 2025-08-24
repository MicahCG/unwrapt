
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, Calendar, Loader2, Check } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const UserMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  if (!user) return null;

  // Check calendar integration on mount
  useEffect(() => {
    checkCalendarIntegration();
  }, [user]);

  const checkCalendarIntegration = async () => {
    if (!user) return;

    try {
      const { data: integration } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .maybeSingle();

      setIsCalendarConnected(!!integration);
    } catch (error) {
      console.error('Error checking calendar integration:', error);
    }
  };

  const connectGoogleCalendar = async () => {
    if (!user) return;

    setIsCalendarLoading(true);
    try {
      // Get current session for auth headers
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }

      console.log('🔗 Getting Google Calendar auth URL...');
      const { data: authData, error: authError } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'get_auth_url' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (authError) {
        console.error('❌ Auth URL error:', authError);
        throw new Error(authError.message || 'Failed to get authorization URL');
      }

      if (authData?.authUrl) {
        console.log('🚀 Redirecting to Google Calendar auth');
        // Direct redirect to Google's OAuth page
        window.location.href = authData.authUrl;
      }
    } catch (error) {
      console.error('💥 Calendar connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect calendar';
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
      setIsCalendarLoading(false);
    }
  };

  const handleCalendarSync = async () => {
    if (!user) return;

    setIsCalendarLoading(true);
    
    try {
      // Get current session for auth headers
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }

      // Check if user has calendar integration
      const { data: integration } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .maybeSingle();

      if (!integration) {
        toast({
          title: "No Calendar Connected",
          description: "Please connect your Google Calendar first to sync recipients.",
          variant: "destructive"
        });
        return;
      }

      // Fetch calendar events
      console.log('🔄 Syncing calendar events...');
      const { data: eventsData, error: eventsError } = await supabase.functions.invoke('google-calendar', {
        body: { 
          action: 'fetch_dashboard_events',
          access_token: integration.access_token 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (eventsError) {
        console.error('❌ Calendar sync error:', eventsError);
        
        // Check if it's an auth error (token expired)
        if (eventsError.status === 401 || eventsError.message?.includes('Calendar access expired')) {
          toast({
            title: "Calendar Access Expired",
            description: "Please reconnect your Google Calendar to sync recipients.",
            variant: "destructive"
          });
          return;
        }
        
        throw new Error(eventsError.message || 'Failed to fetch calendar events');
      }

      const events = eventsData?.events || [];
      console.log('📅 Found calendar events:', events.length);

      // Filter for birthday and anniversary events only
      const importantEvents = events.filter((event: any) => 
        event.category === 'birthday' || event.category === 'anniversary'
      );

      if (importantEvents.length === 0) {
        toast({
          title: "No Events Found",
          description: "No birthday or anniversary events found in your calendar.",
        });
        return;
      }

      // Group events by person
      const peopleMap = new Map<string, any>();
      
      importantEvents.forEach((event: any) => {
        if (event.personName) {
          const personKey = event.personName.toLowerCase().trim();
          
          if (!peopleMap.has(personKey)) {
            peopleMap.set(personKey, {
              name: event.personName,
              birthday: event.category === 'birthday' ? event.date : null,
              anniversary: event.category === 'anniversary' ? event.date : null,
              events: [event]
            });
          } else {
            const person = peopleMap.get(personKey)!;
            if (event.category === 'birthday' && !person.birthday) {
              person.birthday = event.date;
            }
            if (event.category === 'anniversary' && !person.anniversary) {
              person.anniversary = event.date;
            }
            person.events.push(event);
          }
        }
      });

      const calendarPeople = Array.from(peopleMap.values());
      console.log('👥 Found unique people in calendar:', calendarPeople.length);

      // Get existing recipients to avoid duplicates
      const { data: existingRecipients } = await supabase
        .from('recipients')
        .select('name, birthday, anniversary')
        .eq('user_id', user.id);

      // Filter out people who are already recipients
      const newPeople = calendarPeople.filter(person => {
        const isDuplicate = existingRecipients?.some(existing => {
          const nameMatch = existing.name.toLowerCase().trim() === person.name.toLowerCase().trim();
          const birthdayMatch = existing.birthday === person.birthday;
          const anniversaryMatch = existing.anniversary === person.anniversary;
          
          // Consider it a duplicate if name matches and at least one date matches
          return nameMatch && (birthdayMatch || anniversaryMatch);
        });
        
        return !isDuplicate;
      });

      if (newPeople.length === 0) {
        toast({
          title: "Already Up to Date",
          description: "All people from your calendar are already in your recipients list.",
        });
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 3000);
        return;
      }

      // Create new recipients
      const newRecipients = newPeople.map(person => ({
        user_id: user.id,
        name: person.name,
        birthday: person.birthday,
        anniversary: person.anniversary,
        interests: [],
        notes: 'Auto-imported from Google Calendar'
      }));

      const { data: insertedRecipients, error: insertError } = await supabase
        .from('recipients')
        .insert(newRecipients)
        .select();

      if (insertError) {
        console.error('❌ Error inserting recipients:', insertError);
        throw new Error('Failed to create new recipients');
      }

      console.log('✅ Successfully imported recipients:', insertedRecipients.length);

      // Refresh the recipients query
      queryClient.invalidateQueries({ queryKey: ['recipients', user.id] });

      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);

      toast({
        title: "Calendar Synced!",
        description: `Added ${insertedRecipients.length} new recipients from your calendar.`,
      });

    } catch (error) {
      console.error('💥 Calendar sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync calendar';
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const handleCalendarClick = () => {
    if (isCalendarConnected) {
      handleCalendarSync();
    } else {
      connectGoogleCalendar();
    }
  };

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
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSettingsClick}
        className="h-10 px-3 text-brand-charcoal hover:bg-brand-cream hover:text-brand-charcoal flex items-center gap-2"
        title="Settings"
      >
        <Settings className="h-5 w-5" />
        <span className="text-sm">Settings</span>
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="relative h-10 w-10 rounded-full text-brand-charcoal hover:bg-brand-cream hover:text-brand-charcoal p-0"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name} />
              <AvatarFallback className="bg-brand-charcoal text-brand-cream text-sm">
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
          <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleCalendarClick}
          disabled={isCalendarLoading}
          className="text-brand-charcoal hover:bg-brand-cream hover:text-brand-charcoal cursor-pointer"
        >
          {isCalendarLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>{isCalendarConnected ? 'Syncing...' : 'Connecting...'}</span>
            </>
          ) : justSynced ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              <span>Synced!</span>
            </>
          ) : (
            <>
              <Calendar className="mr-2 h-4 w-4" />
              <span>{isCalendarConnected ? 'Refresh Calendar' : 'Connect Calendar'}</span>
            </>
          )}
        </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleSettingsClick}
            className="text-brand-charcoal hover:bg-brand-cream hover:text-brand-charcoal cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleSignOut}
            className="text-brand-charcoal hover:bg-brand-cream hover:text-brand-charcoal cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default UserMenu;


import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { normalizeRecipientName } from '@/lib/dateUtils';

const CalendarSyncButton = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const normalizeDate = (date: string | null) => {
    if (!date) return null;
    return date.split('T')[0];
  };

  // Check calendar connection status
  const { data: isConnected } = useQuery({
    queryKey: ['calendar-connection', user?.id],
    queryFn: async () => {
      const { data: integrations, error } = await supabase
        .rpc('get_my_calendar_integration');

      if (error || !integrations || integrations.length === 0) {
        return false;
      }
      return integrations[0]?.is_connected ?? false;
    },
    enabled: !!user
  });

  const connectGoogleCalendar = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session found');

      const { data: authData, error: authError } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'get_auth_url' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (authError) throw new Error(authError.message || 'Failed to get authorization URL');
      if (authData?.authUrl) {
        window.location.href = authData.authUrl;
      }
    } catch (error) {
      console.error('Calendar connection error:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to connect calendar',
        variant: "destructive"
      });
      setSyncing(false);
    }
  };

  const handleCalendarSync = async () => {
    if (!user) return;

    setSyncing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session found');

      console.log('🔄 Syncing calendar events...');
      const { data: eventsData, error: eventsError } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'fetch_dashboard_events' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (eventsError) {
        console.error('❌ Calendar sync error:', eventsError);
        
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

      const { data: existingRecipients } = await supabase
        .from('recipients')
        .select('name, birthday, anniversary')
        .eq('user_id', user.id);

      console.log('📊 Calendar people to check:', calendarPeople);
      console.log('📊 Existing recipients:', existingRecipients);
      
      const newPeople = calendarPeople.filter(person => {
        const normalizedPersonName = normalizeRecipientName(person.name);
        const isDuplicate = existingRecipients?.some(existing => {
          const normalizedExistingName = normalizeRecipientName(existing.name);
          const nameMatch = normalizedExistingName === normalizedPersonName;
          // Normalize dates for comparison
          const personBday = normalizeDate(person.birthday);
          const existingBday = normalizeDate(existing.birthday);
          const personAnniv = normalizeDate(person.anniversary);
          const existingAnniv = normalizeDate(existing.anniversary);
          
          const birthdayMatch = personBday && existingBday && personBday === existingBday;
          const anniversaryMatch = personAnniv && existingAnniv && personAnniv === existingAnniv;
          
          // Also match by name alone if names are identical after normalization
          // This prevents "Stella" and "Stella's" from creating duplicates
          const nameOnlyMatch = nameMatch;
          
          console.log(`🔍 Comparing: "${person.name}" vs "${existing.name}" | normalized: "${normalizedPersonName}" vs "${normalizedExistingName}" | name: ${nameMatch} | bday: ${personBday} vs ${existingBday} = ${birthdayMatch}`);
          
          return nameOnlyMatch || (nameMatch && (birthdayMatch || anniversaryMatch));
        });
        console.log(`  → ${person.name}: isDuplicate=${isDuplicate}`);
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

      const newRecipients = newPeople.map(person => ({
        user_id: user.id,
        name: person.name,
        birthday: normalizeDate(person.birthday),
        anniversary: normalizeDate(person.anniversary),
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

      queryClient.invalidateQueries({ queryKey: ['recipients', user.id] });

      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);

      toast({
        title: "Calendar Synced!",
        description: `Added ${insertedRecipients.length} new recipients from your calendar.`,
      });

    } catch (error) {
      console.error('💥 Calendar sync error:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : 'Failed to sync calendar',
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleClick = () => {
    if (isConnected) {
      handleCalendarSync();
    } else {
      connectGoogleCalendar();
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={syncing}
      className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream w-full sm:w-auto"
    >
      {syncing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {isConnected ? 'Syncing...' : 'Connecting...'}
        </>
      ) : justSynced ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Synced!
        </>
      ) : (
        <>
          <Calendar className="h-4 w-4 mr-2" />
          {isConnected ? 'Sync Calendar' : 'Connect Calendar'}
        </>
      )}
    </Button>
  );
};

export default CalendarSyncButton;

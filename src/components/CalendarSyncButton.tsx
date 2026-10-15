
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { normalizeRecipientName } from '@/lib/dateUtils';

const RETURN_TO_KEY = 'unwrapt_calendar_return_to';
const REDIRECT_URI_KEY = 'unwrapt_calendar_redirect_uri';
let postOAuthSyncStarted = false;

interface CalendarSyncButtonProps {
  className?: string;
  /** Softer pill that matches the Manual tab chrome. */
  appearance?: 'default' | 'pill';
}

const CalendarSyncButton = ({ className, appearance = 'default' }: CalendarSyncButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
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

      const redirectUri = `${window.location.origin}/auth/calendar/callback`;
      try {
        sessionStorage.setItem(REDIRECT_URI_KEY, redirectUri);
        sessionStorage.setItem(RETURN_TO_KEY, '/?tab=manual&syncCalendar=1');
      } catch {
        /* ignore */
      }

      const { data: authData, error: authError } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'get_auth_url', redirectUri },
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

  // After OAuth returns to Manual tab, import events once (shared across duplicate buttons).
  useEffect(() => {
    if (searchParams.get('syncCalendar') !== '1') return;
    if (!user || !isConnected || syncing || postOAuthSyncStarted) return;
    postOAuthSyncStarted = true;
    const next = new URLSearchParams(searchParams);
    next.delete('syncCalendar');
    setSearchParams(next, { replace: true });
    void handleCalendarSync();
  }, [searchParams, user, isConnected, syncing, setSearchParams]);

  const label = syncing
    ? isConnected
      ? 'Syncing…'
      : 'Connecting…'
    : justSynced
      ? 'Synced!'
      : isConnected
        ? 'Sync calendar'
        : 'Connect calendar';

  if (appearance === 'pill') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={syncing}
        className={
          className ||
          'inline-flex w-full items-center justify-center gap-2 rounded-full border px-3.5 py-2.5 text-[12.5px] font-semibold disabled:opacity-60'
        }
        style={{
          borderColor: 'rgba(42,37,32,0.14)',
          background: '#F1E7D5',
          color: '#2A2520',
        }}
      >
        {syncing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : justSynced ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Calendar className="h-3.5 w-3.5" />
        )}
        {label}
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={syncing}
      className={className || 'w-full border-brand-charcoal text-brand-charcoal hover:bg-brand-cream sm:w-auto'}
    >
      {syncing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {label}
        </>
      ) : justSynced ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          {label}
        </>
      ) : (
        <>
          <Calendar className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
};

export default CalendarSyncButton;

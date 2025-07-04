
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const CalendarSyncButton = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const extractPersonFromEvent = (eventSummary: string) => {
    const summary = eventSummary.toLowerCase();
    let personName = '';
    
    if (summary.includes("'s birthday") || summary.includes("'s bday")) {
      const splitChar = summary.includes("'s birthday") ? "'s birthday" : "'s bday";
      personName = eventSummary.split(splitChar)[0].trim();
    } else if (summary.includes("'s anniversary")) {
      personName = eventSummary.split("'s")[0].trim();
    } else if (summary.includes(" birthday") || summary.includes(" bday")) {
      personName = eventSummary.replace(/birthday|bday/i, '').trim();
    } else if (summary.includes(" anniversary")) {
      personName = eventSummary.replace(/anniversary/i, '').trim();
    } else if (summary.includes("birthday -") || summary.includes("bday -")) {
      const splitStr = summary.includes("birthday -") ? "birthday -" : "bday -";
      personName = eventSummary.split(splitStr)[1].trim();
    } else if (summary.includes("anniversary -")) {
      personName = eventSummary.split("anniversary -")[1].trim();
    } else {
      // Fallback: try to extract any name-like pattern
      const words = eventSummary.split(' ');
      personName = words.find(word => 
        word.length > 2 && 
        word[0] === word[0].toUpperCase() &&
        !['Birthday', 'Bday', 'Anniversary', 'The', 'And', 'Or'].includes(word)
      ) || '';
    }
    
    return personName;
  };

  const handleCalendarSync = async () => {
    if (!user) return;

    setSyncing(true);
    
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
      setSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCalendarSync}
      disabled={syncing}
      className={`border-brand-charcoal text-brand-charcoal hover:bg-brand-cream ${
        justSynced ? 'bg-green-50 border-green-300 text-green-700' : ''
      }`}
    >
      {syncing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Syncing...
        </>
      ) : justSynced ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Synced!
        </>
      ) : (
        <>
          <Calendar className="h-4 w-4 mr-2" />
          Sync Calendar
        </>
      )}
    </Button>
  );
};

export default CalendarSyncButton;

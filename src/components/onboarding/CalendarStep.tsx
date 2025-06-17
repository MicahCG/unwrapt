import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { CheckCircledIcon, CircleIcon } from '@radix-ui/react-icons';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AddRecipientModal from '../AddRecipientModal';

interface CalendarStepProps {
  onNext: (data: any) => void;
  onSkip: () => void;
}

interface CalendarEvent {
  id: string;
  personName: string;
  date: Date;
  type: 'birthday' | 'anniversary';
}

const CalendarStep: React.FC<CalendarStepProps> = ({ onNext, onSkip }) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState<Date | undefined>(new Date());
  const [newEventAnniversaryDate, setNewEventAnniversaryDate] = useState<Date | undefined>(new Date());
  const [newEventBirthdayDate, setNewEventBirthdayDate] = useState<Date | undefined>(new Date());
  const [newEventNameError, setNewEventNameError] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<'birthday' | 'anniversary'>('birthday');
  const [showManualModal, setShowManualModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch calendar events from Supabase
  const { data: calendarEvents, error: calendarError, isLoading: calendarLoading } = useQuery({
    queryKey: ['calendar-events', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error("Error fetching calendar events:", error);
        throw error;
      }

      // Convert date strings to Date objects
      const eventsWithDateObjects = data.map(event => ({
        ...event,
        date: new Date(event.date),
      }));

      return eventsWithDateObjects;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (calendarEvents) {
      setEvents(calendarEvents);
    }
  }, [calendarEvents]);

  useEffect(() => {
    if (date) {
      const eventsForDate = events.filter(event => {
        return event.date.toDateString() === date.toDateString();
      });
      if (eventsForDate.length > 0) {
        setSelectedEvent(eventsForDate[0]);
      } else {
        setSelectedEvent(null);
      }
    }
  }, [date, events]);

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    if (newDate) {
      const eventsForDate = events.filter(event => {
        return event.date.toDateString() === newDate.toDateString();
      });
      if (eventsForDate.length > 0) {
        setSelectedEvent(eventsForDate[0]);
      } else {
        setSelectedEvent(null);
      }
    }
  };

  const handleNext = () => {
    if (selectedEvent) {
      onNext({ selectedPersonForGift: selectedEvent });
    } else {
      toast({
        title: "No event selected",
        description: "Please select an event or skip this step.",
      });
    }
  };

  const handleAddEvent = () => {
    setIsAddingEvent(true);
    setNewEventName('');
    setNewEventDate(new Date());
    setNewEventAnniversaryDate(new Date());
    setNewEventBirthdayDate(new Date());
    setNewEventNameError('');
  };

  const handleSaveEvent = async () => {
    if (!newEventName.trim()) {
      setNewEventNameError('Event name is required.');
      return;
    }

    let selectedDate;
    if (selectedEventType === 'birthday') {
      selectedDate = newEventBirthdayDate;
    } else {
      selectedDate = newEventAnniversaryDate;
    }

    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date for the event.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([
          {
            user_id: user?.id,
            personName: newEventName,
            date: selectedDate.toISOString(),
            type: selectedEventType,
          },
        ]);

      if (error) {
        console.error("Error saving event:", error);
        toast({
          title: "Error",
          description: "Failed to save event. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Optimistically update the local state
      const newEvent = {
        id: data[0].id, // Assuming the insert returns the new event with an ID
        personName: newEventName,
        date: selectedDate,
        type: selectedEventType,
      };

      setEvents(prevEvents => [...prevEvents, newEvent]);

      // If the selected date matches the new event date, select the new event
      if (date && selectedDate.toDateString() === date.toDateString()) {
        setSelectedEvent(newEvent);
      }

      toast({
        title: "Success",
        description: "Event saved successfully!",
      });
    } catch (error) {
      console.error("Error saving event:", error);
      toast({
        title: "Error",
        description: "Failed to save event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAddingEvent(false);
    }
  };

  const handleCancelAddEvent = () => {
    setIsAddingEvent(false);
  };

  const handleEventTypeChange = (type: 'birthday' | 'anniversary') => {
    setSelectedEventType(type);
  };

  const EventTypeSelector = () => {
    return (
      <div className="flex items-center space-x-2">
        <Label htmlFor="birthday" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Birthday
        </Label>
        <Input
          type="radio"
          id="birthday"
          name="eventType"
          value="birthday"
          checked={selectedEventType === 'birthday'}
          onChange={() => handleEventTypeChange('birthday')}
          className="h-4 w-4 border-brand-charcoal text-brand-charcoal focus:ring-brand-charcoal"
        />

        <Label htmlFor="anniversary" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Anniversary
        </Label>
        <Input
          type="radio"
          id="anniversary"
          name="eventType"
          value="anniversary"
          checked={selectedEventType === 'anniversary'}
          onChange={() => handleEventTypeChange('anniversary')}
          className="h-4 w-4 border-brand-charcoal text-brand-charcoal focus:ring-brand-charcoal"
        />
      </div>
    );
  };

  return (
    <Card className="animate-fadeInUp">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-charcoal/10 p-4 rounded-full">
            <CalendarIcon className="h-12 w-12 text-brand-charcoal" />
          </div>
        </div>
        <CardTitle className="text-3xl mb-2">
          When is their special day?
        </CardTitle>
        <p className="text-muted-foreground">
          Select a date to find the perfect gift.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex justify-center w-full">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center" side="bottom">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                disabled={(date) =>
                  date > new Date()
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {selectedEvent ? (
          <div className="border rounded-md p-4">
            <h3 className="text-lg font-semibold">{selectedEvent.personName}</h3>
            <p className="text-sm text-muted-foreground">
              {selectedEvent.type === 'birthday' ? 'Birthday' : 'Anniversary'} on {format(selectedEvent.date, "PPP")}
            </p>
          </div>
        ) : (
          <div className="border rounded-md p-4 text-center text-muted-foreground">
            No event selected for this date.
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="secondary" onClick={onSkip}>Skip</Button>
          <Button onClick={handleNext}>Continue</Button>
        </div>

        <Dialog open={isAddingEvent} onOpenChange={setIsAddingEvent}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" onClick={handleAddEvent}>
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
              <DialogDescription>
                Add a new birthday or anniversary to your calendar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Event Name
                </Label>
                <Input
                  type="text"
                  id="name"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              {newEventNameError && (
                <div className="text-red-500 text-sm">{newEventNameError}</div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="event-type" className="text-right">
                  Event Type
                </Label>
                <div className="col-span-3">
                  <EventTypeSelector />
                </div>
              </div>

              {selectedEventType === 'birthday' ? (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="birthday-date" className="text-right">
                    Birthday Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !newEventBirthdayDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newEventBirthdayDate ? format(newEventBirthdayDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center" side="bottom">
                      <Calendar
                        mode="single"
                        selected={newEventBirthdayDate}
                        onSelect={setNewEventBirthdayDate}
                        disabled={(date) =>
                          date > new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="anniversary-date" className="text-right">
                    Anniversary Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !newEventAnniversaryDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newEventAnniversaryDate ? format(newEventAnniversaryDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center" side="bottom">
                      <Calendar
                        mode="single"
                        selected={newEventAnniversaryDate}
                        onSelect={setNewEventAnniversaryDate}
                        disabled={(date) =>
                          date > new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="secondary" onClick={handleCancelAddEvent}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleSaveEvent}>
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" className="w-full" onClick={() => setShowManualModal(true)}>
          Enter Manually
        </Button>
      </CardContent>
      
      {showManualModal && (
        <AddRecipientModal
          isOpen={showManualModal}
          onClose={() => {
            setShowManualModal(false);
            queryClient.invalidateQueries({ queryKey: ['recipients'] });
          }}
        />
      )}
    </Card>
  );
};

export default CalendarStep;

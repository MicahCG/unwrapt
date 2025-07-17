
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Calendar, Plus, Users, Clock, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cleanName } from '@/lib/utils';
import ScheduleGiftModal from './ScheduleGiftModal';
import AddRecipientModal from './AddRecipientModal';
import CalendarSyncButton from './CalendarSyncButton';
import GiftDetailsModal from './GiftDetailsModal';
import RecipientSelectionModal from './RecipientSelectionModal';
import { useQueryClient } from '@tanstack/react-query';

// Holiday data with emojis
const holidays = [
  {
    id: 'halloween',
    name: "Halloween",
    date: "October 31, 2025",
    emoji: "🎃",
    callToAction: "No tricks, just treats... and great gifts",
    giftType: "Vanilla Candle",
    priceRange: "$25-$50"
  },
  {
    id: 'thanksgiving',
    name: "Thanksgiving",
    date: "November 27, 2025",
    emoji: "🦃",
    callToAction: "Turkey's temporary, great gifts are forever",
    giftType: "Vanilla Candle",
    priceRange: "$50-$100"
  },
  {
    id: 'backtoschool',
    name: "Back to School",
    date: "August 15, 2025",
    emoji: "🎒",
    callToAction: "School supplies are basic - be brilliant instead",
    giftType: "Coffee",
    priceRange: "$25-$50"
  },
  {
    id: 'christmas',
    name: "Christmas",
    date: "December 25, 2025",
    emoji: "🎄",
    callToAction: "Get on the nice list with the perfect gift",
    giftType: "Vanilla Candle",
    priceRange: "$50-$100"
  },
  {
    id: 'mothersday',
    name: "Mother's Day",
    date: "May 12, 2025",
    emoji: "💐",
    callToAction: "Give Mom something that says 'thanks for not selling me to the circus'",
    giftType: "Bath & Body",
    priceRange: "$50-$100"
  }
];

const DashboardRecipients = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [schedulingGift, setSchedulingGift] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAllRecipients, setShowAllRecipients] = useState(false);
  const [viewingGift, setViewingGift] = useState(null);
  const [selectedHoliday, setSelectedHoliday] = useState(null);

  // Fetch recipients with scheduled gifts sorted by priority
  const { data: recipients } = useQuery({
    queryKey: ['recipients', user?.id],
    queryFn: async () => {
      console.log('📊 DashboardRecipients: Querying recipients for user_id:', user?.id);
      
      const { data, error } = await supabase
        .from('recipients')
        .select(`
          *,
          scheduled_gifts:scheduled_gifts(
            id,
            occasion,
            occasion_date,
            gift_type,
            gift_description,
            price_range,
            status,
            payment_status,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      console.log('📊 DashboardRecipients: Raw database response:', { data, error, count: data?.length });
      
      if (error) throw error;

      // Process recipients with their next events and sort
      const today = new Date();
      const currentYear = today.getFullYear();

      const recipientsWithData = data.map(recipient => {
        const occasions = [];
        
        if (recipient.birthday) {
          // Parse date as local date to avoid timezone issues
          const birthdayParts = recipient.birthday.split('-');
          const birthday = new Date(parseInt(birthdayParts[0]), parseInt(birthdayParts[1]) - 1, parseInt(birthdayParts[2]));
          let thisYearBirthday = new Date(currentYear, birthday.getMonth(), birthday.getDate());
          if (thisYearBirthday < today) {
            thisYearBirthday.setFullYear(currentYear + 1);
          }
          occasions.push({ type: 'Birthday', date: thisYearBirthday });
        }
        
        if (recipient.anniversary) {
          // Parse date as local date to avoid timezone issues
          const anniversaryParts = recipient.anniversary.split('-');
          const anniversary = new Date(parseInt(anniversaryParts[0]), parseInt(anniversaryParts[1]) - 1, parseInt(anniversaryParts[2]));
          let thisYearAnniversary = new Date(currentYear, anniversary.getMonth(), anniversary.getDate());
          if (thisYearAnniversary < today) {
            thisYearAnniversary.setFullYear(currentYear + 1);
          }
          occasions.push({ type: 'Anniversary', date: thisYearAnniversary });
        }
        
        occasions.sort((a, b) => a.date.getTime() - b.date.getTime());
        const nextOccasion = occasions[0];

        const hasScheduledGifts = recipient.scheduled_gifts && recipient.scheduled_gifts.length > 0;
        const nextScheduledGift = hasScheduledGifts ? 
          recipient.scheduled_gifts
            .filter(gift => new Date(gift.occasion_date) >= today)
            .sort((a, b) => new Date(a.occasion_date).getTime() - new Date(b.occasion_date).getTime())[0] 
          : null;

        return {
          ...recipient,
          nextOccasion,
          hasScheduledGifts,
          nextScheduledGift,
          daysUntilNext: nextOccasion ? Math.ceil((nextOccasion.date.getTime() - today.getTime()) / (1000 * 3600 * 24)) : null
        };
      });

      console.log('📊 DashboardRecipients: Processing recipients:', recipientsWithData.map(r => ({
        name: r.name,
        hasScheduledGifts: r.hasScheduledGifts,
        daysUntilNext: r.daysUntilNext,
        nextOccasion: r.nextOccasion
      })));

      // Filter out recipients who already have scheduled gifts
      const recipientsWithoutGifts = recipientsWithData.filter(recipient => !recipient.hasScheduledGifts);
      
      // Sort filtered recipients by urgency/days until next event
      const sortedRecipients = recipientsWithoutGifts.sort((a, b) => {
        // Sort by urgency/days until next event
        if (!a.daysUntilNext && !b.daysUntilNext) return a.name.localeCompare(b.name);
        if (!a.daysUntilNext) return 1;
        if (!b.daysUntilNext) return -1;
        return a.daysUntilNext - b.daysUntilNext;
      });

      console.log('📊 DashboardRecipients: Final sorted recipients:', sortedRecipients.map(r => r.name));
      return sortedRecipients;
    },
    enabled: !!user
  });

  // Fetch gift coverage data for progress bar
  const { data: giftCoverage } = useQuery({
    queryKey: ['gift-coverage', user?.id],
    queryFn: async () => {
      if (!user?.id) return { totalRecipients: 0, recipientsWithGifts: 0 };
      
      console.log('🔍 Fetching gift coverage for user:', user.id);
      
      // Get total recipients
      const { data: recipients, error: recipientsError } = await supabase
        .from('recipients')
        .select('id')
        .eq('user_id', user.id);
      
      console.log('📊 Recipients query result:', { 
        count: recipients?.length, 
        error: recipientsError,
        recipients: recipients 
      });
      
      if (recipientsError) {
        console.error('Error fetching recipients:', recipientsError);
        return { totalRecipients: 0, recipientsWithGifts: 0 };
      }
      
      // Get recipients with scheduled gifts (any status)
      const { data: giftsData, error: giftsError } = await supabase
        .from('scheduled_gifts')
        .select('recipient_id')
        .eq('user_id', user.id);
      
      console.log('🎁 Scheduled gifts query result:', { 
        count: giftsData?.length, 
        error: giftsError,
        gifts: giftsData 
      });
      
      if (giftsError) {
        console.error('Error fetching scheduled gifts:', giftsError);
        return { totalRecipients: recipients?.length || 0, recipientsWithGifts: 0 };
      }
      
      // Count unique recipients with gifts
      const uniqueRecipientIds = new Set(giftsData?.map(gift => gift.recipient_id) || []);
      
      const result = {
        totalRecipients: recipients?.length || 0,
        recipientsWithGifts: uniqueRecipientIds.size
      };
      
      console.log('📈 Final gift coverage result:', result);
      return result;
    },
    enabled: !!user?.id
  });

  const progressPercentage = giftCoverage?.totalRecipients > 0 
    ? (giftCoverage.recipientsWithGifts / giftCoverage.totalRecipients) * 100 
    : 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilText = (daysUntil: number, eventType: string) => {
    if (daysUntil === 0) return `${eventType} today!`;
    if (daysUntil === 1) return `${eventType} tomorrow`;
    return `${eventType} in ${daysUntil} days`;
  };

  // Get upcoming holidays within the next 3 months
  const getUpcomingHolidays = () => {
    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(today.getMonth() + 3);
    
    return holidays
      .map(holiday => {
        const [monthDay, year] = holiday.date.split(', ');
        const holidayDate = new Date(`${monthDay}, ${today.getFullYear()}`);
        
        // If the holiday has passed this year, move to next year
        if (holidayDate < today) {
          holidayDate.setFullYear(today.getFullYear() + 1);
        }
        
        const daysUntil = Math.ceil((holidayDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        
        return {
          ...holiday,
          parsedDate: holidayDate,
          daysUntil,
          isHoliday: true
        };
      })
      .filter(holiday => holiday.parsedDate <= threeMonthsFromNow)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 3); // Show only next 3 holidays
  };

  const upcomingHolidays = getUpcomingHolidays();
  
  // Combine recipients and holidays, then sort chronologically while maintaining recipient priority
  const combinedItems = (() => {
    if (!recipients) return upcomingHolidays;
    
    const allItems = [...recipients, ...upcomingHolidays];
    
    // Sort all items chronologically by their next event date
    return allItems.sort((a: any, b: any) => {
      // For recipients, use daysUntilNext; for holidays, use daysUntil
      const aDays = a.isHoliday ? a.daysUntil : a.daysUntilNext;
      const bDays = b.isHoliday ? b.daysUntil : b.daysUntilNext;
      
      // Handle null/undefined days (items without upcoming events go to end)
      if (aDays == null && bDays == null) {
        // If both have no upcoming events, sort recipients by name, holidays by date
        if (a.isHoliday && b.isHoliday) return a.daysUntil - b.daysUntil;
        if (a.isHoliday) return 1; // Holidays go after recipients with no events
        if (b.isHoliday) return -1;
        return a.name.localeCompare(b.name);
      }
      if (aDays == null) return 1;
      if (bDays == null) return -1;
      
      // Primary sort: by days until next event
      if (aDays !== bDays) return aDays - bDays;
      
      // Secondary sort: if same number of days, recipients without scheduled gifts come first
      if (!a.isHoliday && !b.isHoliday) {
        if (!a.hasScheduledGifts && b.hasScheduledGifts) return -1;
        if (a.hasScheduledGifts && !b.hasScheduledGifts) return 1;
        return a.name.localeCompare(b.name);
      }
      
      // If comparing recipient vs holiday with same days, recipient comes first
      if (!a.isHoliday && b.isHoliday) return -1;
      if (a.isHoliday && !b.isHoliday) return 1;
      
      return 0;
    });
  })();

  // Determine which items to show based on state
  const displayedItems = combinedItems ? (showAllRecipients ? combinedItems : combinedItems.slice(0, 5)) : [];
  const hasMoreThanFive = combinedItems && combinedItems.length > 5;

  const handleDeleteGift = async (giftId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_gifts')
        .delete()
        .eq('id', giftId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['upcoming-gifts'] });
      queryClient.invalidateQueries({ queryKey: ['user-metrics'] });
    } catch (error) {
      console.error('Error deleting gift:', error);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-brand-charcoal" />
          <h2 className="text-lg sm:text-xl font-semibold text-brand-charcoal">Your Recipients</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            size="sm"
            className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90 w-full sm:w-auto"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* Gift Coverage Progress Bar */}
      {giftCoverage && giftCoverage.totalRecipients > 0 && (
        <Card className="bg-white border-brand-cream">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-brand-charcoal">Gift Scheduling Progress</h3>
                  <p className="text-xs sm:text-sm text-brand-charcoal/70">
                    {giftCoverage.recipientsWithGifts} out of {giftCoverage.totalRecipients} recipients have scheduled gifts
                  </p>
                </div>
                <Badge 
                  variant={progressPercentage === 100 ? "default" : "secondary"}
                  className={progressPercentage === 100 ? "bg-green-100 text-green-800" : "bg-brand-cream text-brand-charcoal"}
                >
                  {Math.round(progressPercentage)}%
                </Badge>
              </div>
              <Progress 
                value={progressPercentage} 
                className="h-2 sm:h-3"
              />
              {progressPercentage < 100 && (
                <p className="text-xs text-brand-charcoal/60">
                  Schedule gifts for {giftCoverage.totalRecipients - giftCoverage.recipientsWithGifts} more recipient{giftCoverage.totalRecipients - giftCoverage.recipientsWithGifts !== 1 ? 's' : ''} to complete your planning!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {combinedItems && combinedItems.length > 0 ? (
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-3">
            {displayedItems.map((item: any) => (
              <div 
                key={item.id}
                role="button"
                tabIndex={0}
                className="group relative bg-white border border-brand-cream/50 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-brand-charcoal/10 transition-all duration-300 ease-out overflow-hidden hover:bg-gradient-to-r hover:from-white hover:to-brand-cream/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-charcoal/20 focus:ring-offset-2"
                onClick={() => {
                  if (item.isHoliday) {
                    setSelectedHoliday(item);
                    setShowAddModal(false);
                  } else if (!item.hasScheduledGifts || !item.nextScheduledGift) {
                    setSchedulingGift(item);
                  } else {
                    setViewingGift(item.nextScheduledGift);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (item.isHoliday) {
                      setSelectedHoliday(item);
                      setShowAddModal(false);
                    } else if (!item.hasScheduledGifts || !item.nextScheduledGift) {
                      setSchedulingGift(item);
                    } else {
                      setViewingGift(item.nextScheduledGift);
                    }
                  }
                }}
              >
                {/* Default State - Compact */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {/* Avatar (emoji for holidays, initial for recipients) */}
                      <div className="w-10 h-10 rounded-full bg-brand-cream flex items-center justify-center flex-shrink-0">
                        {item.isHoliday ? (
                          <span className="text-xl">{item.emoji}</span>
                        ) : (
                          <span className="text-sm font-bold text-brand-charcoal">
                            {cleanName(item.name).charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Name */}
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-brand-charcoal text-base sm:text-lg pr-2">
                            {item.isHoliday ? item.name : cleanName(item.name)}
                          </h3>
                          {/* Icon positioned in top right */}
                          {((item.isHoliday && item.daysUntil <= 90) || (item.nextOccasion && item.daysUntilNext <= 30)) && (
                            <span className="text-base flex-shrink-0">⏰</span>
                          )}
                        </div>
                        
                        {/* Countdown */}
                        <div className={`text-sm ${
                          (item.isHoliday && item.daysUntil <= 90) || (item.daysUntilNext <= 30)
                            ? 'text-red-500' 
                            : 'text-brand-charcoal/70'
                        }`}>
                          {item.isHoliday ? (
                            <span>{item.name} in {item.daysUntil} days</span>
                          ) : item.nextOccasion && (
                            <span>Birthday in {item.daysUntilNext} days</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Badge (if has scheduled gifts) */}
                    {!item.isHoliday && item.hasScheduledGifts && (
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs opacity-100 group-hover:opacity-0 transition-opacity duration-300 ml-2 flex-shrink-0">
                        <Check className="h-3 w-3 mr-1" />
                        Scheduled
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Expanded State (on hover) - Only visible on hover */}
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                  <div className="flex items-center justify-between pt-2 border-t border-brand-cream/30">
                    {/* Date / Description */}
                    {item.isHoliday ? (
                      <div className="flex items-center space-x-2 text-sm text-brand-charcoal/80">
                        <span className="text-base">🎁</span>
                        <span className="font-medium">
                          {item.callToAction}
                        </span>
                      </div>
                    ) : item.nextOccasion && (
                      <div className="flex items-center space-x-2 text-sm text-brand-charcoal/80">
                        <span className="text-base">🎉</span>
                        <span className="font-medium">
                          {formatDate(item.nextOccasion.date.toISOString())}
                        </span>
                      </div>
                    )}
                    
                    {/* Action Indicator */}
                    <div className="flex items-center space-x-2 text-sm text-brand-charcoal/60 transition-all duration-200 group-hover:scale-105">
                      {item.isHoliday ? (
                        <>
                          <Gift className="h-4 w-4 animate-bounce" />
                          <span>Click to schedule holiday gift</span>
                        </>
                      ) : item.hasScheduledGifts && item.nextScheduledGift ? (
                        <>
                          <Gift className="h-4 w-4" />
                          <span>Click to view gift</span>
                        </>
                      ) : (
                        <>
                          <Gift className="h-4 w-4 animate-bounce" />
                          <span>Click to schedule gift</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMoreThanFive && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream"
                onClick={() => setShowAllRecipients(!showAllRecipients)}
              >
                {showAllRecipients ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    View More ({combinedItems.length - 5} more)
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card className="bg-white border-brand-cream w-full">
          <CardContent className="py-6 sm:py-8 text-center px-4 sm:px-6">
            <div className="text-brand-charcoal/50 mb-4 text-sm sm:text-base">
              No recipients added yet
            </div>
            <Button 
              className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90 w-full sm:w-auto"
              onClick={() => setShowAddModal(true)}
            >
              Add Your First Recipient
            </Button>
          </CardContent>
        </Card>
      )}

      {schedulingGift && (
        <ScheduleGiftModal
          recipient={schedulingGift}
          isOpen={!!schedulingGift}
          onClose={() => setSchedulingGift(null)}
        />
      )}

      {viewingGift && (
        <GiftDetailsModal
          gift={viewingGift}
          isOpen={!!viewingGift}
          onClose={() => setViewingGift(null)}
          onDelete={handleDeleteGift}
        />
      )}

      <AddRecipientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Holiday Recipient Selection */}
      {selectedHoliday && (
        <RecipientSelectionModal
          isOpen={!!selectedHoliday}
          onClose={() => setSelectedHoliday(null)}
          onRecipientSelected={(recipient) => {
            setSelectedRecipient(recipient);
            setSelectedHoliday(null);
          }}
        />
      )}

      {/* Holiday Gift Scheduling */}
      {selectedRecipient && selectedHoliday && (
        <ScheduleGiftModal
          recipient={{
            ...selectedRecipient,
            _holidayPreset: {
              occasion: selectedHoliday.name,
              occasion_date: selectedHoliday.date.replace(', 2025', ', ' + new Date().getFullYear()),
              gift_type: selectedHoliday.giftType || '',
              price_range: selectedHoliday.priceRange || '',
              delivery_date: ''
            }
          }}
          isOpen={!!selectedRecipient}
          onClose={() => {
            setSelectedRecipient(null);
            setSelectedHoliday(null);
          }}
        />
      )}
    </div>
  );
};

export default DashboardRecipients;

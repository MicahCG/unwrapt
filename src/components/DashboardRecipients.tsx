
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
import { useQueryClient } from '@tanstack/react-query';

const DashboardRecipients = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [schedulingGift, setSchedulingGift] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAllRecipients, setShowAllRecipients] = useState(false);
  const [viewingGift, setViewingGift] = useState(null);

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

      // Sort: recipients without scheduled gifts first, then those with gifts, by urgency within each group
      const sortedRecipients = recipientsWithData.sort((a, b) => {
        // Primary sort: no scheduled gifts first
        if (!a.hasScheduledGifts && b.hasScheduledGifts) return -1;
        if (a.hasScheduledGifts && !b.hasScheduledGifts) return 1;
        
        // Secondary sort: by urgency/days until next event
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
      
      // Get recipients with scheduled gifts
      const { data: giftsData, error: giftsError } = await supabase
        .from('scheduled_gifts')
        .select('recipient_id')
        .eq('user_id', user.id)
        .eq('status', 'scheduled');
      
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

  // Determine which recipients to show based on state
  const displayedRecipients = recipients ? (showAllRecipients ? recipients : recipients.slice(0, 5)) : [];
  const hasMoreThanFive = recipients && recipients.length > 5;

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
            variant="outline"
            size="sm"
            className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream w-full sm:w-auto"
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

      {recipients && recipients.length > 0 ? (
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-3 sm:space-y-4">
            {displayedRecipients.map((recipient: any) => (
              <Card 
                key={recipient.id} 
                className={`border-brand-cream hover:shadow-md transition-shadow w-full ${
                  recipient.hasScheduledGifts ? 'bg-gray-50' : 'bg-white'
                }`}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <div className="flex flex-col space-y-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-brand-charcoal text-sm sm:text-base truncate">
                              {cleanName(recipient.name)}
                            </h3>
                            {recipient.hasScheduledGifts && (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Scheduled
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mt-1">
                            {recipient.relationship && (
                              <Badge 
                                variant="secondary" 
                                className="text-xs bg-brand-cream text-brand-charcoal border-brand-cream w-fit"
                              >
                                {recipient.relationship}
                              </Badge>
                            )}
                            {recipient.nextScheduledGift ? (
                              <div className="flex items-center text-xs">
                                <Clock className="h-3 w-3 mr-1 flex-shrink-0 text-brand-charcoal" />
                                <span className="font-medium text-gray-500">
                                  Next gift: {formatDate(recipient.nextScheduledGift.occasion_date)}
                                </span>
                              </div>
                            ) : recipient.nextOccasion && (
                              <>
                                <div className="flex items-center text-xs">
                                  <Clock className="h-3 w-3 mr-1 flex-shrink-0 text-brand-charcoal" />
                                  <span className="font-medium text-brand-charcoal">
                                    {getDaysUntilText(recipient.daysUntilNext, recipient.nextOccasion.type)}
                                  </span>
                                </div>
                                <div className="flex items-center text-xs text-brand-charcoal/70">
                                  <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span>{formatDate(recipient.nextOccasion.date.toISOString())}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {recipient.hasScheduledGifts && recipient.nextScheduledGift ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream w-full sm:w-auto flex-shrink-0"
                        onClick={() => setViewingGift(recipient.nextScheduledGift)}
                      >
                        <Gift className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        <span className="text-xs sm:text-sm">View Gift</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90 w-full sm:w-auto flex-shrink-0"
                        onClick={() => setSchedulingGift(recipient)}
                      >
                        <Gift className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        <span className="text-xs sm:text-sm">Schedule Gift</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
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
                    View More ({recipients.length - 5} more)
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
    </div>
  );
};

export default DashboardRecipients;

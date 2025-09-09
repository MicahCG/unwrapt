
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MonthlyOpportunitiesOverlayProps {
  onComplete: () => void;
}

const MonthlyOpportunitiesOverlay: React.FC<MonthlyOpportunitiesOverlayProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const [displayedText, setDisplayedText] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [showCount, setShowCount] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  // Get current month's start and end dates
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);
  
  // Get next 2 weeks dates
  const twoWeeksFromNow = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));

  // Fetch recipients with events this month or next 2 weeks that don't have scheduled gifts
  const { data: monthlyOpportunities, isLoading } = useQuery({
    queryKey: ['monthly-opportunities', user?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!user?.id) return { count: 0, opportunities: [], allScheduled: false, timeframe: 'month', noCoverage: false };
      
      console.log('Fetching monthly opportunities...');
      
      // Get all recipients for the user
      const { data: recipients, error: recipientsError } = await supabase
        .from('recipients')
        .select('id, name, birthday, anniversary')
        .eq('user_id', user.id);
      
      if (recipientsError) {
        console.error('Error fetching recipients:', recipientsError);
        return { count: 0, opportunities: [], allScheduled: false, timeframe: 'month', noCoverage: false };
      }

      if (!recipients) return { count: 0, opportunities: [], allScheduled: false, timeframe: 'month', noCoverage: false };

      console.log('Recipients found:', recipients.length);

      // First, check for opportunities this month
      const monthlyOpportunitiesList = [];
      recipients.forEach(recipient => {
        if (recipient.birthday) {
          const birthday = new Date(recipient.birthday);
          let birthdayThisYear = new Date(currentYear, birthday.getMonth(), birthday.getDate());
          
          // If birthday has passed this year, use next year's date
          if (birthdayThisYear <= now) {
            birthdayThisYear = new Date(currentYear + 1, birthday.getMonth(), birthday.getDate());
          }
          
          if (birthdayThisYear >= monthStart && birthdayThisYear <= monthEnd) {
            monthlyOpportunitiesList.push({
              recipientId: recipient.id,
              recipientName: recipient.name,
              occasion: 'birthday',
              date: birthdayThisYear
            });
          }
        }
        
        if (recipient.anniversary) {
          const anniversary = new Date(recipient.anniversary);
          let anniversaryThisYear = new Date(currentYear, anniversary.getMonth(), anniversary.getDate());
          
          // If anniversary has passed this year, use next year's date
          if (anniversaryThisYear <= now) {
            anniversaryThisYear = new Date(currentYear + 1, anniversary.getMonth(), anniversary.getDate());
          }
          
          if (anniversaryThisYear >= monthStart && anniversaryThisYear <= monthEnd) {
            monthlyOpportunitiesList.push({
              recipientId: recipient.id,
              recipientName: recipient.name,
              occasion: 'anniversary',
              date: anniversaryThisYear
            });
          }
        }
      });

      console.log('Total opportunities this month:', monthlyOpportunitiesList.length);

      // If we have monthly opportunities, check if they're scheduled
      if (monthlyOpportunitiesList.length > 0) {
        const recipientIds = [...new Set(monthlyOpportunitiesList.map(o => o.recipientId))];
        const { data: scheduledGifts, error: giftsError } = await supabase
          .from('scheduled_gifts')
          .select('recipient_id, occasion_date, occasion')
          .eq('user_id', user.id)
          .in('recipient_id', recipientIds)
          .gte('occasion_date', monthStart.toISOString().split('T')[0])
          .lte('occasion_date', monthEnd.toISOString().split('T')[0]);
        
        if (giftsError) {
          console.error('Error fetching scheduled gifts:', giftsError);
          return { count: monthlyOpportunitiesList.length, opportunities: monthlyOpportunitiesList, allScheduled: false, timeframe: 'month', noCoverage: false };
        }

        console.log('Scheduled gifts this month:', scheduledGifts?.length || 0);

        const scheduledSet = new Set(
          scheduledGifts?.map(gift => `${gift.recipient_id}-${gift.occasion.toLowerCase()}`) || []
        );
        
        const unscheduledMonthlyOpportunities = monthlyOpportunitiesList.filter(
          opp => !scheduledSet.has(`${opp.recipientId}-${opp.occasion.toLowerCase()}`)
        );

        unscheduledMonthlyOpportunities.sort((a, b) => a.date.getTime() - b.date.getTime());

        const allScheduled = unscheduledMonthlyOpportunities.length === 0 && monthlyOpportunitiesList.length > 0;

        console.log('Unscheduled monthly opportunities:', unscheduledMonthlyOpportunities.length);
        return { 
          count: unscheduledMonthlyOpportunities.length, 
          opportunities: unscheduledMonthlyOpportunities,
          allScheduled,
          timeframe: 'month',
          noCoverage: false
        };
      }

      // No monthly opportunities, check next 2 weeks
      console.log('No monthly opportunities, checking next 2 weeks...');
      const twoWeekOpportunitiesList = [];
      recipients.forEach(recipient => {
        if (recipient.birthday) {
          const birthday = new Date(recipient.birthday);
          let birthdayThisYear = new Date(currentYear, birthday.getMonth(), birthday.getDate());
          
          // If birthday has passed this year, use next year's date
          if (birthdayThisYear <= now) {
            birthdayThisYear = new Date(currentYear + 1, birthday.getMonth(), birthday.getDate());
          }
          
          if (birthdayThisYear > now && birthdayThisYear <= twoWeeksFromNow) {
            twoWeekOpportunitiesList.push({
              recipientId: recipient.id,
              recipientName: recipient.name,
              occasion: 'birthday',
              date: birthdayThisYear
            });
          }
        }
        
        if (recipient.anniversary) {
          const anniversary = new Date(recipient.anniversary);
          let anniversaryThisYear = new Date(currentYear, anniversary.getMonth(), anniversary.getDate());
          
          // If anniversary has passed this year, use next year's date
          if (anniversaryThisYear <= now) {
            anniversaryThisYear = new Date(currentYear + 1, anniversary.getMonth(), anniversary.getDate());
          }
          
          if (anniversaryThisYear > now && anniversaryThisYear <= twoWeeksFromNow) {
            twoWeekOpportunitiesList.push({
              recipientId: recipient.id,
              recipientName: recipient.name,
              occasion: 'anniversary',
              date: anniversaryThisYear
            });
          }
        }
      });

      console.log('Total opportunities in next 2 weeks:', twoWeekOpportunitiesList.length);

      // If we have 2-week opportunities, check if they're scheduled
      if (twoWeekOpportunitiesList.length > 0) {
        const recipientIds = [...new Set(twoWeekOpportunitiesList.map(o => o.recipientId))];
        const { data: scheduledGifts, error: giftsError } = await supabase
          .from('scheduled_gifts')
          .select('recipient_id, occasion_date, occasion')
          .eq('user_id', user.id)
          .in('recipient_id', recipientIds)
          .gte('occasion_date', now.toISOString().split('T')[0])
          .lte('occasion_date', twoWeeksFromNow.toISOString().split('T')[0]);
        
        if (giftsError) {
          console.error('Error fetching scheduled gifts for 2 weeks:', giftsError);
          return { count: twoWeekOpportunitiesList.length, opportunities: twoWeekOpportunitiesList, allScheduled: false, timeframe: 'twoWeeks', noCoverage: false };
        }

        const scheduledSet = new Set(
          scheduledGifts?.map(gift => `${gift.recipient_id}-${gift.occasion.toLowerCase()}`) || []
        );
        
        const unscheduledTwoWeekOpportunities = twoWeekOpportunitiesList.filter(
          opp => !scheduledSet.has(`${opp.recipientId}-${opp.occasion.toLowerCase()}`)
        );

        unscheduledTwoWeekOpportunities.sort((a, b) => a.date.getTime() - b.date.getTime());

        const allScheduled = unscheduledTwoWeekOpportunities.length === 0 && twoWeekOpportunitiesList.length > 0;

        console.log('Unscheduled 2-week opportunities:', unscheduledTwoWeekOpportunities.length);
        return { 
          count: unscheduledTwoWeekOpportunities.length, 
          opportunities: unscheduledTwoWeekOpportunities,
          allScheduled,
          timeframe: 'twoWeeks',
          noCoverage: false
        };
      }

      // No opportunities in either timeframe, but check if there are any scheduled gifts this month
      console.log('No opportunities found in month or next 2 weeks, checking for existing scheduled gifts');
      
      // Check if there are any scheduled gifts for this month
      const { data: existingGifts, error: existingGiftsError } = await supabase
        .from('scheduled_gifts')
        .select('id')
        .eq('user_id', user.id)
        .gte('occasion_date', monthStart.toISOString().split('T')[0])
        .lte('occasion_date', monthEnd.toISOString().split('T')[0]);
      
      if (existingGiftsError) {
        console.error('Error checking existing gifts:', existingGiftsError);
        return { count: 0, opportunities: [], allScheduled: false, timeframe: 'month', noCoverage: false };
      }
      
      const hasScheduledGifts = existingGifts && existingGifts.length > 0;
      console.log('Has scheduled gifts this month:', hasScheduledGifts);
      
      return { 
        count: 0, 
        opportunities: [], 
        allScheduled: false, 
        timeframe: 'month', 
        noCoverage: hasScheduledGifts // Only covered if there are actually scheduled gifts
      };
    },
    enabled: !!user?.id
  });

  const data = monthlyOpportunities || { count: 0, opportunities: [], allScheduled: false, timeframe: 'month', noCoverage: false };
  const opportunityCount = data.count;
  const opportunities = data.opportunities;
  const allScheduled = data.allScheduled;
  const timeframe = data.timeframe;
  const noCoverage = data.noCoverage;
  
  const getWelcomeText = () => {
    const firstName = profile?.full_name?.split(' ')[0] || 'there';
    return `Welcome back, ${firstName}`;
  };

  const getOpportunitiesText = () => {
    if (noCoverage) {
      return "You're covered for this month! 🌟";
    }
    if (allScheduled) {
      return timeframe === 'twoWeeks' 
        ? "You're all set for the next 2 weeks 🎉"
        : "You're all set for this month 🎉";
    }
    if (timeframe === 'twoWeeks') {
      return `You have ${opportunityCount} chance${opportunityCount !== 1 ? 's' : ''} to be thoughtful in the next 2 weeks 🎁`;
    }
    return `You have ${opportunityCount} chance${opportunityCount !== 1 ? 's' : ''} to be thoughtful this month 🎁`;
  };
  
  const welcomeText = getWelcomeText();
  const opportunitiesText = getOpportunitiesText();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    console.log('MonthlyOpportunitiesOverlay mounted, opportunity count:', opportunityCount, 'isLoading:', isLoading);
    
    // Don't do anything while loading
    if (isLoading) return;

    // First show welcome message
    let currentIndex = 0;
    const welcomeInterval = setInterval(() => {
      if (currentIndex < welcomeText.length) {
        setDisplayedText(welcomeText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(welcomeInterval);
        // Pause before showing opportunities
        setTimeout(() => {
          setShowWelcome(false);
          setDisplayedText('');
          
          // Now show opportunities text
          let oppIndex = 0;
          const opportunitiesInterval = setInterval(() => {
            if (oppIndex < opportunitiesText.length) {
              setDisplayedText(opportunitiesText.substring(0, oppIndex + 1));
              oppIndex++;
            } else {
              clearInterval(opportunitiesInterval);
              setShowCount(true);
              // Auto-dismiss after showing for a bit
              setTimeout(() => {
                setIsVisible(false);
                setTimeout(onComplete, 500);
              }, 3000);
            }
          }, 60);
        }, 1000);
      }
    }, 60);

    return () => clearInterval(welcomeInterval);
  }, [welcomeText, opportunitiesText, opportunityCount, onComplete, isLoading]);

  // Show loading state
  if (isLoading) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-charcoal/20 border-t-brand-charcoal rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-brand-charcoal/70">Checking your opportunities...</p>
        </div>
      </div>
    );
  }

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="text-center space-y-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-brand-charcoal tracking-tight">
          {displayedText}
          <span className="animate-pulse">|</span>
        </h1>
        
        {/* Content that fades in - only show for opportunities, not welcome */}
        <div className={`transition-opacity duration-1000 ${showCount && !showWelcome ? 'opacity-100' : 'opacity-0'}`}>
          {allScheduled ? (
            // All scheduled state
            <div className="space-y-4">
              <div className="text-6xl">🎉</div>
              <p className="text-lg text-brand-charcoal/70">
                Every special moment is covered.
              </p>
            </div>
          ) : opportunityCount > 0 ? (
            // Unscheduled opportunities
            <div className="space-y-6">
              <div className="relative w-32 h-32 mx-auto">
                {/* Background circle */}
                <div className="w-32 h-32 rounded-full border-8 border-brand-charcoal/10 flex items-center justify-center">
                  <div className="text-4xl font-bold text-brand-charcoal">
                    {opportunityCount}
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute -top-2 -right-2 text-2xl">🎁</div>
                <div className="absolute -bottom-2 -left-2 text-2xl">💝</div>
              </div>
              
              <div className="space-y-3">
                <p className="text-lg text-brand-charcoal/70">
                  Don't miss these special moments
                </p>
                
                {/* Show up to 3 opportunities with names and dates */}
                <div className="space-y-2 text-brand-charcoal">
                  {opportunities.slice(0, 3).map((opp, index) => (
                    <div key={`${opp.recipientId}-${opp.occasion}`} className="text-sm">
                      <span className="font-medium">{opp.recipientName}</span> - {opp.occasion} on {formatDate(opp.date)}
                    </div>
                  ))}
                  {opportunities.length > 3 && (
                    <div className="text-sm text-brand-charcoal/60">
                      +{opportunities.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // No opportunities - either covered for month or actually no occasions
            <div className="space-y-4">
              <div className="text-6xl">🌟</div>
              <p className="text-lg text-brand-charcoal/70">
                {noCoverage 
                  ? "Take a well-deserved break from gift planning."
                  : timeframe === 'twoWeeks' 
                    ? "No special occasions in the next 2 weeks." 
                    : "No special occasions this month."
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyOpportunitiesOverlay;

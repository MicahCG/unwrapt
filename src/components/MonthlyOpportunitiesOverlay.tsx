
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MonthlyOpportunitiesOverlayProps {
  onComplete: () => void;
}

const MonthlyOpportunitiesOverlay: React.FC<MonthlyOpportunitiesOverlayProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [displayedText, setDisplayedText] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [showCount, setShowCount] = useState(false);

  // Get current month's start and end dates
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);

  // Fetch recipients with events this month that don't have scheduled gifts
  const { data: monthlyOpportunities, isLoading } = useQuery({
    queryKey: ['monthly-opportunities', user?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!user?.id) return { count: 0, opportunities: [], allScheduled: false };
      
      console.log('Fetching monthly opportunities...');
      
      // Get all recipients for the user
      const { data: recipients, error: recipientsError } = await supabase
        .from('recipients')
        .select('id, name, birthday, anniversary')
        .eq('user_id', user.id);
      
      if (recipientsError) {
        console.error('Error fetching recipients:', recipientsError);
        return { count: 0, opportunities: [], allScheduled: false };
      }

      if (!recipients) return { count: 0, opportunities: [], allScheduled: false };

      console.log('Recipients found:', recipients.length);

      // Filter recipients who have events this month and build opportunities list
      const opportunitiesList = [];
      recipients.forEach(recipient => {
        if (recipient.birthday) {
          const birthday = new Date(recipient.birthday);
          const birthdayThisYear = new Date(currentYear, birthday.getMonth(), birthday.getDate());
          if (birthdayThisYear >= monthStart && birthdayThisYear <= monthEnd) {
            opportunitiesList.push({
              recipientId: recipient.id,
              recipientName: recipient.name,
              occasion: 'birthday',
              date: birthdayThisYear
            });
          }
        }
        
        if (recipient.anniversary) {
          const anniversary = new Date(recipient.anniversary);
          const anniversaryThisYear = new Date(currentYear, anniversary.getMonth(), anniversary.getDate());
          if (anniversaryThisYear >= monthStart && anniversaryThisYear <= monthEnd) {
            opportunitiesList.push({
              recipientId: recipient.id,
              recipientName: recipient.name,
              occasion: 'anniversary',
              date: anniversaryThisYear
            });
          }
        }
      });

      console.log('Total opportunities this month:', opportunitiesList.length);

      if (opportunitiesList.length === 0) {
        return { count: 0, opportunities: [], allScheduled: false };
      }

      // Get scheduled gifts for this month
      const recipientIds = [...new Set(opportunitiesList.map(o => o.recipientId))];
      const { data: scheduledGifts, error: giftsError } = await supabase
        .from('scheduled_gifts')
        .select('recipient_id, occasion_date, occasion')
        .eq('user_id', user.id)
        .in('recipient_id', recipientIds)
        .gte('occasion_date', monthStart.toISOString().split('T')[0])
        .lte('occasion_date', monthEnd.toISOString().split('T')[0]);
      
      if (giftsError) {
        console.error('Error fetching scheduled gifts:', giftsError);
        return { count: opportunitiesList.length, opportunities: opportunitiesList, allScheduled: false };
      }

      console.log('Scheduled gifts this month:', scheduledGifts?.length || 0);

      // Filter out opportunities that already have scheduled gifts
      const scheduledSet = new Set(
        scheduledGifts?.map(gift => `${gift.recipient_id}-${gift.occasion}`) || []
      );
      
      const unscheduledOpportunities = opportunitiesList.filter(
        opp => !scheduledSet.has(`${opp.recipientId}-${opp.occasion}`)
      );

      // Sort by date
      unscheduledOpportunities.sort((a, b) => a.date.getTime() - b.date.getTime());

      const allScheduled = unscheduledOpportunities.length === 0 && opportunitiesList.length > 0;

      console.log('Unscheduled opportunities:', unscheduledOpportunities.length);
      return { 
        count: unscheduledOpportunities.length, 
        opportunities: unscheduledOpportunities,
        allScheduled
      };
    },
    enabled: !!user?.id
  });

  const data = monthlyOpportunities || { count: 0, opportunities: [], allScheduled: false };
  const opportunityCount = data.count;
  const opportunities = data.opportunities;
  const allScheduled = data.allScheduled;
  
  const fullText = allScheduled 
    ? "You're all set for this month 🎉"
    : `You have ${opportunityCount} chance${opportunityCount !== 1 ? 's' : ''} to be thoughtful this month 🎁`;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    console.log('MonthlyOpportunitiesOverlay mounted, opportunity count:', opportunityCount, 'isLoading:', isLoading);
    
    // Don't do anything while loading
    if (isLoading) return;

    let currentIndex = 0;
    const typewriterInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typewriterInterval);
        setShowCount(true);
        // Auto-dismiss after showing for a bit
        setTimeout(() => {
          setIsVisible(false);
          setTimeout(onComplete, 500);
        }, 3000);
      }
    }, 60);

    return () => clearInterval(typewriterInterval);
  }, [fullText, opportunityCount, onComplete, isLoading]);

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
        
        {/* Content that fades in */}
        <div className={`transition-opacity duration-1000 ${showCount ? 'opacity-100' : 'opacity-0'}`}>
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
            // No opportunities this month
            <div className="space-y-4">
              <div className="text-6xl">🌟</div>
              <p className="text-lg text-brand-charcoal/70">
                No special occasions this month.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyOpportunitiesOverlay;

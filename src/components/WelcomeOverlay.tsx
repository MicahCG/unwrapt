import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WelcomeOverlayProps {
  onComplete: () => void;
}

const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const [displayedText, setDisplayedText] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const fullText = `Welcome back, ${firstName}`;

  // Fetch user metrics and scheduled gifts for current year
  const { data: metrics } = useQuery({
    queryKey: ['user-metrics', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data: metricsData } = await supabase
        .from('user_metrics')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Get scheduled gifts for current year
      const currentYear = new Date().getFullYear();
      const { data: yearlyGifts } = await supabase
        .from('scheduled_gifts')
        .select('id')
        .eq('user_id', user.id)
        .gte('occasion_date', `${currentYear}-01-01`)
        .lt('occasion_date', `${currentYear + 1}-01-01`);

      return {
        ...metricsData,
        yearlyScheduledGifts: yearlyGifts?.length || 0
      };
    },
    enabled: !!user?.id
  });

  const totalRecipients = metrics?.total_recipients || 0;
  const yearlyScheduledGifts = metrics?.yearlyScheduledGifts || 0;
  const estimatedTimeSaved = metrics?.estimated_time_saved || 0;
  const hoursPerRecipient = totalRecipients > 0 ? Math.round(estimatedTimeSaved / totalRecipients) : 0;
  
  const progressPercentage = totalRecipients > 0 ? Math.round((yearlyScheduledGifts / totalRecipients) * 100) : 0;

  useEffect(() => {
    let currentIndex = 0;
    const typewriterInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typewriterInterval);
        // Start fade to progress after text is complete + small delay
        setTimeout(() => {
          setShowWelcome(false);
          setTimeout(() => {
            setShowProgress(true);
            // Animate progress bar
            const progressInterval = setInterval(() => {
              setProgress((prev) => {
                if (prev >= progressPercentage) {
                  clearInterval(progressInterval);
                  // Start fade out after animation completes
                  setTimeout(() => {
                    setIsVisible(false);
                    setTimeout(onComplete, 500);
                  }, 2000);
                  return progressPercentage;
                }
                return prev + 2;
              });
            }, 30);
          }, 500);
        }, 1000);
      }
    }, 80); // Typewriter speed

    return () => clearInterval(typewriterInterval);
  }, [fullText, onComplete, progressPercentage]);

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
      {showWelcome && (
        <div className={`text-center transition-opacity duration-500 ${showWelcome ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-brand-charcoal tracking-tight">
            {displayedText}
            <span className="animate-pulse">|</span>
          </h1>
        </div>
      )}

      {showProgress && (
        <div className={`text-center max-w-md mx-auto px-6 transition-opacity duration-500 ${showProgress ? 'opacity-100' : 'opacity-0'}`}>
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto mb-6 relative">
              <svg
                className="w-32 h-32 transform -rotate-90"
                viewBox="0 0 100 100"
              >
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                  className="transition-all duration-300 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-semibold text-brand-charcoal">
                  {progress}%
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-light text-brand-charcoal">
              Your Gift Planning Progress
            </h2>
            
            <div className="text-brand-charcoal/70">
              <p className="text-lg">
                <span className="font-semibold text-brand-charcoal">{yearlyScheduledGifts}</span> of{' '}
                <span className="font-semibold text-brand-charcoal">{totalRecipients}</span> gifts scheduled this year
              </p>
              
              {hoursPerRecipient > 0 && (
                <p className="text-sm mt-2">
                  Saving you <span className="font-semibold text-brand-charcoal">{hoursPerRecipient} hours</span> per recipient
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomeOverlay;
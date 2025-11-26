import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface WelcomeOverlayProps {
  onComplete: () => void;
}

const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const [displayedText, setDisplayedText] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [showProgress, setShowProgress] = useState(false);

  // Extract first name from profile, Google user metadata, or email
  const getFirstName = () => {
    // Try profile full_name first
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0];
    }

    // Try Google user metadata
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0];
    }

    // Try email username as fallback
    if (user?.email) {
      const emailUsername = user.email.split('@')[0];
      // Capitalize first letter and remove numbers/special chars
      return emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1).replace(/[0-9._-]/g, '');
    }

    return 'there';
  };

  const firstName = getFirstName();
  const fullText = `Welcome back, ${firstName}`;

  // Fetch user metrics and recipient data
  const { data: userMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['user-metrics', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // First, calculate/update metrics
      const { error: calcError } = await supabase.rpc('calculate_user_metrics', { user_uuid: user.id });
      if (calcError) {
        console.error('Error calculating user metrics:', calcError);
      }
      
      // Then fetch the updated metrics
      const { data, error } = await supabase
        .from('user_metrics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user metrics:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id
  });

  const { data: recipientCount } = useQuery({
    queryKey: ['recipient-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { count, error } = await supabase
        .from('recipients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error counting recipients:', error);
        return 0;
      }
      
      return count || 0;
    },
    enabled: !!user?.id
  });

  const scheduledGifts = userMetrics?.total_scheduled_gifts || 0;
  const totalRecipients = recipientCount || 0;
  const timeSaved = userMetrics?.estimated_time_saved || 0;

  useEffect(() => {
    let currentIndex = 0;
    const typewriterInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typewriterInterval);
        // Show progress wheel after text is complete
        setTimeout(() => {
          setShowProgress(true);
          // Then fade out after showing progress for a bit
          setTimeout(() => {
            setIsVisible(false);
            setTimeout(onComplete, 500); // Wait for fade out animation
          }, 2500);
        }, 800);
      }
    }, 80); // Typewriter speed

    return () => clearInterval(typewriterInterval);
  }, [fullText, onComplete]);

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
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-brand-charcoal tracking-tight">
          {displayedText}
          <span className="animate-pulse">|</span>
        </h1>
        
        {/* Progress wheel that fades in after welcome message */}
        <div className={`transition-opacity duration-1000 ${showProgress ? 'opacity-100' : 'opacity-0'}`}>
          <div className="relative w-32 h-32 mx-auto">
            {/* Background circle */}
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
                fill="transparent"
                className="opacity-20"
              />
              {/* Progress circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - (totalRecipients > 0 ? scheduledGifts / totalRecipients : 0))}`}
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.3))'
                }}
              />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-semibold text-brand-charcoal">
                {scheduledGifts}
              </div>
              <div className="text-sm text-brand-charcoal/70">
                of {totalRecipients}
              </div>
            </div>
          </div>
          
          {/* Stats text */}
          <div className="mt-6 space-y-2">
            <p className="text-lg text-brand-charcoal font-medium">
              {scheduledGifts} gift{scheduledGifts !== 1 ? 's' : ''} scheduled this year
            </p>
            <p className="text-brand-charcoal/70">
              Saving you {Math.round(timeSaved / 60)} hour{Math.round(timeSaved / 60) !== 1 ? 's' : ''} of shopping time
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeOverlay;

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Calendar, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cleanName } from '@/lib/utils';

interface RecipientSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipientSelected: (recipient: any) => void;
}

const RecipientSelectionModal: React.FC<RecipientSelectionModalProps> = ({
  isOpen,
  onClose,
  onRecipientSelected
}) => {
  const { user } = useAuth();

  // Fetch recipients
  const { data: recipients } = useQuery({
    queryKey: ['recipients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipients')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Sort by next occasion date (soonest first)
      const today = new Date();
      const currentYear = today.getFullYear();
      
      const recipientsWithOccasions = data?.map(recipient => {
        const occasions = [];
        
        if (recipient.birthday) {
          const birthdayParts = recipient.birthday.split('-');
          const birthday = new Date(parseInt(birthdayParts[0]), parseInt(birthdayParts[1]) - 1, parseInt(birthdayParts[2]));
          let thisYearBirthday = new Date(currentYear, birthday.getMonth(), birthday.getDate());
          if (thisYearBirthday < today) {
            thisYearBirthday.setFullYear(currentYear + 1);
          }
          occasions.push({ type: 'Birthday', date: thisYearBirthday });
        }
        
        if (recipient.anniversary) {
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
        
        return {
          ...recipient,
          nextOccasion,
          daysUntilNext: nextOccasion ? Math.ceil((nextOccasion.date.getTime() - today.getTime()) / (1000 * 3600 * 24)) : null
        };
      });
      
      // Sort by days until next occasion (soonest first)
      const sortedRecipients = recipientsWithOccasions?.sort((a, b) => {
        if (!a.daysUntilNext && !b.daysUntilNext) return a.name.localeCompare(b.name);
        if (!a.daysUntilNext) return 1;
        if (!b.daysUntilNext) return -1;
        return a.daysUntilNext - b.daysUntilNext;
      });
      
      return sortedRecipients || [];
    },
    enabled: !!user && isOpen
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getNextOccasion = (recipient: any) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    const occasions = [];
    
    if (recipient.birthday) {
      // Parse date as local date to avoid timezone issues
      const birthdayParts = recipient.birthday.split('-');
      const birthday = new Date(parseInt(birthdayParts[0]), parseInt(birthdayParts[1]) - 1, parseInt(birthdayParts[2]));
      const thisYearBirthday = new Date(currentYear, birthday.getMonth(), birthday.getDate());
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(currentYear + 1);
      }
      occasions.push({ type: 'Birthday', date: thisYearBirthday });
    }
    
    if (recipient.anniversary) {
      // Parse date as local date to avoid timezone issues
      const anniversaryParts = recipient.anniversary.split('-');
      const anniversary = new Date(parseInt(anniversaryParts[0]), parseInt(anniversaryParts[1]) - 1, parseInt(anniversaryParts[2]));
      const thisYearAnniversary = new Date(currentYear, anniversary.getMonth(), anniversary.getDate());
      if (thisYearAnniversary < today) {
        thisYearAnniversary.setFullYear(currentYear + 1);
      }
      occasions.push({ type: 'Anniversary', date: thisYearAnniversary });
    }
    
    occasions.sort((a, b) => a.date.getTime() - b.date.getTime());
    return occasions[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Select a Recipient</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {recipients && recipients.length > 0 ? (
            recipients.map((recipient: any) => {
              const isUpcoming = recipient.daysUntilNext && recipient.daysUntilNext <= 30;
              
              return (
                <div 
                  key={recipient.id}
                  role="button"
                  tabIndex={0}
                  className={`group relative border rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 ease-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-charcoal/20 focus:ring-offset-2 ${
                    isUpcoming 
                      ? 'bg-gradient-to-r from-orange-50 to-pink-50 border-orange-200/50 hover:shadow-orange-200/30 hover:bg-gradient-to-r hover:from-orange-100 hover:to-pink-100' 
                      : 'bg-white border-brand-cream/50 hover:shadow-brand-charcoal/10 hover:bg-gradient-to-r hover:from-white hover:to-brand-cream/20'
                  }`}
                  onClick={() => onRecipientSelected(recipient)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRecipientSelected(recipient);
                    }
                  }}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        {/* Avatar with initials */}
                        <Avatar className="h-10 w-10 bg-gradient-to-br from-brand-charcoal to-brand-charcoal/80">
                          <AvatarFallback className="bg-gradient-to-br from-brand-charcoal to-brand-charcoal/80 text-brand-cream font-semibold text-sm">
                            {getInitials(cleanName(recipient.name))}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Name and details */}
                        <div className="flex-1">
                          <h3 className="font-bold text-brand-charcoal text-base">{cleanName(recipient.name)}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            {recipient.relationship && (
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${
                                  isUpcoming 
                                    ? 'bg-orange-100 text-orange-800' 
                                    : 'bg-brand-cream text-brand-charcoal/70'
                                }`}
                              >
                                {recipient.relationship}
                              </Badge>
                            )}
                            {recipient.nextOccasion && (
                              <div className={`flex items-center text-xs ${
                                isUpcoming 
                                  ? 'text-orange-700 font-medium' 
                                  : 'text-brand-charcoal/70'
                              }`}>
                                <Calendar className="h-3 w-3 mr-1" />
                                <span className="font-medium">{recipient.nextOccasion.type}:</span>
                                <span className="ml-1">{formatDate(recipient.nextOccasion.date.toISOString())}</span>
                                {isUpcoming && (
                                  <span className="ml-1 text-base">⏰</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Arrow icon */}
                      <ChevronRight className={`h-5 w-5 transition-all duration-200 group-hover:translate-x-1 ${
                        isUpcoming ? 'text-orange-600' : 'text-brand-charcoal/40'
                      }`} />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-brand-charcoal/50">
              No recipients found. Add recipients first to schedule gifts.
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecipientSelectionModal;

